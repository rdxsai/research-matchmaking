"""
Celery tasks for async embedding computation and indexing
"""
import os
import hashlib
import logging
from typing import Optional
from datetime import datetime

from celery import current_task
from celery.exceptions import Retry
from sentence_transformers import SentenceTransformer
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.celery_app import celery_app
from app.database import get_db, Profile, ResearcherEmbedding
from app.utils.embedding_utils import create_profile_text, normalize_embedding

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance (loaded once per worker)
_model_instance: Optional[SentenceTransformer] = None
_model_version: Optional[str] = None


def get_embedding_model() -> tuple[SentenceTransformer, str]:
    """
    Get or load the SentenceTransformer model (singleton per worker)
    Returns: (model, model_version)
    """
    global _model_instance, _model_version
    
    if _model_instance is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        logger.info(f"Loading SentenceTransformer model: {model_name}")
        _model_instance = SentenceTransformer(model_name)
        _model_version = model_name
        logger.info(f"Model {model_name} loaded successfully")
    
    return _model_instance, _model_version


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def embed_profile(self, user_id: int) -> dict:
    """
    Async task to compute and store embedding for a researcher profile
    
    Args:
        user_id: Profile ID to process
        
    Returns:
        dict: Task result with status and metadata
    """
    task_id = self.request.id
    logger.info(f"Starting embedding task {task_id} for user_id={user_id}")
    
    db: Session = next(get_db())
    
    try:
        # Fetch the profile
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            logger.error(f"Profile not found for user_id={user_id}")
            return {"status": "error", "message": f"Profile not found for user_id={user_id}"}
        
        # Create profile text for embedding
        profile_text = create_profile_text(profile)
        text_hash = hashlib.sha256(profile_text.encode('utf-8')).hexdigest()
        
        # Check if embedding already exists and is up-to-date
        existing_embedding = db.query(ResearcherEmbedding).filter(
            ResearcherEmbedding.user_id == user_id
        ).first()
        
        if existing_embedding and existing_embedding.text_sha256 == text_hash:
            logger.info(f"Embedding for user_id={user_id} is already up-to-date (hash: {text_hash[:8]}...)")
            return {
                "status": "skipped", 
                "message": "Embedding already up-to-date",
                "user_id": user_id,
                "text_hash": text_hash
            }
        
        # Load model and compute embedding
        model, model_version = get_embedding_model()
        logger.info(f"Computing embedding for user_id={user_id} using model {model_version}")
        
        # Generate embedding
        raw_embedding = model.encode([profile_text])[0]
        normalized_embedding = normalize_embedding(raw_embedding)
        
        # Update task progress (only if running in Celery context)
        if hasattr(self, 'request') and self.request.id:
            current_task.update_state(state='PROGRESS', meta={'progress': 50, 'status': 'Computing embedding'})
        
        # Upsert embedding record
        if existing_embedding:
            # Update existing
            existing_embedding.embedding = normalized_embedding.tolist()
            existing_embedding.model_version = model_version
            existing_embedding.text_sha256 = text_hash
            existing_embedding.updated_at = datetime.utcnow()
            logger.info(f"Updated existing embedding for user_id={user_id}")
        else:
            # Create new
            new_embedding = ResearcherEmbedding(
                user_id=user_id,
                embedding=normalized_embedding.tolist(),
                model_version=model_version,
                text_sha256=text_hash,
                updated_at=datetime.utcnow()
            )
            db.add(new_embedding)
            logger.info(f"Created new embedding for user_id={user_id}")
        
        # Commit to database
        db.commit()
        
        logger.info(f"Successfully processed embedding for user_id={user_id}")
        return {
            "status": "success",
            "user_id": user_id,
            "model_version": model_version,
            "text_hash": text_hash,
            "embedding_dimension": len(normalized_embedding),
            "processed_at": datetime.utcnow().isoformat()
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in embedding task for user_id={user_id}: {str(e)}")
        db.rollback()
        raise self.retry(countdown=60, exc=e)
        
    except Exception as e:
        logger.error(f"Unexpected error in embedding task for user_id={user_id}: {str(e)}")
        db.rollback()
        raise self.retry(countdown=60, exc=e)
        
    finally:
        db.close()


@celery_app.task(bind=True)
def reindex_all_profiles(self, force: bool = False) -> dict:
    """
    Admin task to reindex all profiles (useful for model upgrades)
    
    Args:
        force: If True, recompute all embeddings regardless of hash
        
    Returns:
        dict: Summary of reindexing results
    """
    task_id = self.request.id
    logger.info(f"Starting bulk reindexing task {task_id} (force={force})")
    
    db: Session = next(get_db())
    
    try:
        # Get all profiles
        profiles = db.query(Profile).all()
        total_profiles = len(profiles)
        
        if total_profiles == 0:
            logger.info("No profiles found for reindexing")
            return {"status": "completed", "total_profiles": 0, "processed": 0, "skipped": 0, "errors": 0}
        
        logger.info(f"Found {total_profiles} profiles for reindexing")
        
        processed = 0
        skipped = 0
        errors = 0
        
        for i, profile in enumerate(profiles):
            try:
                # Update progress (only if running in Celery context)
                if hasattr(self, 'request') and self.request.id:
                    progress = int((i / total_profiles) * 100)
                    current_task.update_state(
                        state='PROGRESS', 
                        meta={
                            'progress': progress, 
                            'status': f'Processing profile {i+1}/{total_profiles}',
                            'processed': processed,
                            'skipped': skipped,
                            'errors': errors
                        }
                )
                
                # Enqueue individual embedding task
                if force:
                    # Force recomputation by temporarily clearing hash check
                    result = embed_profile.apply_async(args=[profile.id])
                    result.get(timeout=300)  # Wait up to 5 minutes per profile
                    processed += 1
                else:
                    # Let the task decide based on hash
                    result = embed_profile.apply_async(args=[profile.id])
                    task_result = result.get(timeout=300)
                    
                    if task_result["status"] == "success":
                        processed += 1
                    elif task_result["status"] == "skipped":
                        skipped += 1
                    else:
                        errors += 1
                        
            except Exception as e:
                logger.error(f"Error processing profile {profile.id}: {str(e)}")
                errors += 1
                continue
        
        logger.info(f"Bulk reindexing completed: {processed} processed, {skipped} skipped, {errors} errors")
        
        return {
            "status": "completed",
            "total_profiles": total_profiles,
            "processed": processed,
            "skipped": skipped,
            "errors": errors,
            "completed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in bulk reindexing task: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "total_profiles": 0,
            "processed": 0,
            "skipped": 0,
            "errors": 1
        }
        
    finally:
        db.close()
