#!/usr/bin/env python3
"""
Direct embedding computation script for immediate testing
Bypasses Celery to compute embeddings directly
"""
import sys
import os
import hashlib
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.database import get_db, Profile, ResearcherEmbedding
from app.utils.embedding_utils import create_profile_text, normalize_embedding
from datetime import datetime

def compute_embedding_direct(profile_id=None):
    """
    Compute embedding directly for a specific profile or all profiles
    """
    print("🚀 Starting direct embedding computation...")
    
    # Load model
    print("📥 Loading SentenceTransformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    model_version = 'all-MiniLM-L6-v2'
    print("✅ Model loaded successfully")
    
    # Get database session
    db: Session = next(get_db())
    
    try:
        # Get profiles to process
        if profile_id:
            profiles = db.query(Profile).filter(Profile.id == profile_id).all()
            print(f"🎯 Processing specific profile ID: {profile_id}")
        else:
            profiles = db.query(Profile).all()
            print(f"📊 Processing all {len(profiles)} profiles")
        
        if not profiles:
            print("❌ No profiles found to process")
            return
        
        processed = 0
        skipped = 0
        errors = 0
        
        for i, profile in enumerate(profiles):
            try:
                print(f"\n🔄 Processing profile {i+1}/{len(profiles)}: {profile.name} (ID: {profile.id})")
                
                # Create profile text
                profile_text = create_profile_text(profile)
                text_hash = hashlib.sha256(profile_text.encode('utf-8')).hexdigest()
                
                print(f"📝 Profile text: {profile_text[:100]}...")
                print(f"🔐 Text hash: {text_hash[:16]}...")
                
                # Check if embedding already exists and is up-to-date
                existing_embedding = db.query(ResearcherEmbedding).filter(
                    ResearcherEmbedding.user_id == profile.id
                ).first()
                
                if existing_embedding and existing_embedding.text_sha256 == text_hash:
                    print("⏭️  Embedding already up-to-date, skipping")
                    skipped += 1
                    continue
                
                # Compute embedding
                print("🧠 Computing embedding...")
                raw_embedding = model.encode([profile_text])[0]
                normalized_embedding = normalize_embedding(raw_embedding)
                
                print(f"📐 Embedding computed: {len(normalized_embedding)} dimensions")
                
                # Upsert embedding record
                if existing_embedding:
                    # Update existing
                    existing_embedding.embedding = normalized_embedding.tolist()
                    existing_embedding.model_version = model_version
                    existing_embedding.text_sha256 = text_hash
                    existing_embedding.updated_at = datetime.utcnow()
                    print("🔄 Updated existing embedding")
                else:
                    # Create new
                    new_embedding = ResearcherEmbedding(
                        user_id=profile.id,
                        embedding=normalized_embedding.tolist(),
                        model_version=model_version,
                        text_sha256=text_hash,
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_embedding)
                    print("✨ Created new embedding")
                
                # Commit to database
                db.commit()
                processed += 1
                print("✅ Successfully processed")
                
            except Exception as e:
                print(f"❌ Error processing profile {profile.id}: {str(e)}")
                db.rollback()
                errors += 1
                continue
        
        print(f"\n🎉 Direct embedding computation completed!")
        print(f"📊 Results: {processed} processed, {skipped} skipped, {errors} errors")
        
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Compute embeddings directly')
    parser.add_argument('--profile-id', type=int, help='Specific profile ID to process')
    
    args = parser.parse_args()
    
    compute_embedding_direct(profile_id=args.profile_id)
