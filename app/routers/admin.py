"""
Admin routes for embedding management and system administration
"""
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, Profile, ResearcherEmbedding
from app.auth import get_current_user
from app.schemas import User
from app.tasks.embedding_tasks import embed_profile, reindex_all_profiles
from app.utils.embedding_utils import should_recompute_embedding

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Verify that the current user has admin privileges
    For now, this is a simple check - in production, you'd want proper role-based access
    """
    # TODO: Implement proper admin role checking
    # For now, we'll use a simple email-based check
    admin_emails = ["admin@example.com", "rudra@example.com"]  # Configure as needed
    
    if current_user.email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


@router.get("/embedding/stats")
async def get_embedding_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(verify_admin_user)
) -> Dict[str, Any]:
    """
    Get statistics about embedding indexing status
    """
    try:
        # Count total profiles
        total_profiles = db.query(Profile).count()
        
        # Count profiles with embeddings
        profiles_with_embeddings = db.query(ResearcherEmbedding).count()
        
        # Get model version distribution
        model_versions = db.query(ResearcherEmbedding.model_version).distinct().all()
        model_version_counts = {}
        for (version,) in model_versions:
            count = db.query(ResearcherEmbedding).filter(
                ResearcherEmbedding.model_version == version
            ).count()
            model_version_counts[version] = count
        
        # Calculate coverage percentage
        coverage_percentage = (profiles_with_embeddings / total_profiles * 100) if total_profiles > 0 else 0
        
        return {
            "total_profiles": total_profiles,
            "profiles_with_embeddings": profiles_with_embeddings,
            "profiles_without_embeddings": total_profiles - profiles_with_embeddings,
            "coverage_percentage": round(coverage_percentage, 2),
            "model_version_distribution": model_version_counts,
            "status": "healthy" if coverage_percentage > 90 else "needs_attention"
        }
        
    except Exception as e:
        logger.error(f"Error getting embedding stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve embedding statistics"
        )


@router.post("/embedding/reindex")
async def trigger_reindex_all(
    force: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    admin_user: User = Depends(verify_admin_user)
) -> Dict[str, Any]:
    """
    Trigger reindexing of all profiles
    
    Args:
        force: If True, recompute all embeddings regardless of hash
    """
    try:
        # Enqueue the bulk reindexing task
        task = reindex_all_profiles.delay(force=force)
        
        logger.info(f"Admin {admin_user.email} triggered bulk reindexing (force={force}), task_id={task.id}")
        
        return {
            "message": "Bulk reindexing task enqueued successfully",
            "task_id": task.id,
            "force_recompute": force,
            "status": "enqueued"
        }
        
    except Exception as e:
        logger.error(f"Error triggering bulk reindex: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger bulk reindexing"
        )


@router.post("/embedding/profile/{profile_id}")
async def trigger_profile_embedding(
    profile_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    admin_user: User = Depends(verify_admin_user)
) -> Dict[str, Any]:
    """
    Trigger embedding computation for a specific profile
    
    Args:
        profile_id: Profile ID to process
        force: If True, recompute embedding regardless of hash
    """
    try:
        # Verify profile exists
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile {profile_id} not found"
            )
        
        # Check if recomputation is needed (unless forced)
        if not force:
            existing_embedding = db.query(ResearcherEmbedding).filter(
                ResearcherEmbedding.user_id == profile_id
            ).first()
            
            if existing_embedding:
                should_recompute, current_hash = should_recompute_embedding(
                    profile, existing_embedding.text_sha256
                )
                if not should_recompute:
                    return {
                        "message": "Embedding is already up-to-date",
                        "profile_id": profile_id,
                        "status": "skipped",
                        "current_hash": current_hash
                    }
        
        # Enqueue the embedding task
        task = embed_profile.delay(profile_id)
        
        logger.info(f"Admin {admin_user.email} triggered embedding for profile {profile_id}, task_id={task.id}")
        
        return {
            "message": "Embedding task enqueued successfully",
            "profile_id": profile_id,
            "task_id": task.id,
            "force_recompute": force,
            "status": "enqueued"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering profile embedding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger profile embedding"
        )


@router.get("/embedding/task/{task_id}")
async def get_task_status(
    task_id: str,
    admin_user: User = Depends(verify_admin_user)
) -> Dict[str, Any]:
    """
    Get status of an embedding task
    
    Args:
        task_id: Celery task ID
    """
    try:
        from app.celery_app import celery_app
        
        # Get task result
        result = celery_app.AsyncResult(task_id)
        
        return {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "info": result.info,
            "ready": result.ready(),
            "successful": result.successful() if result.ready() else None,
            "failed": result.failed() if result.ready() else None
        }
        
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task status"
        )
