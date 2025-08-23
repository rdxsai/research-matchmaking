#!/usr/bin/env python3
"""
CLI tool for managing researcher profile embeddings
"""
import os
import sys
import argparse
import logging
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db, Profile, ResearcherEmbedding
from app.tasks.embedding_tasks import embed_profile, reindex_all_profiles
from app.celery_app import celery_app
from app.utils.embedding_utils import should_recompute_embedding

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def check_embedding_status():
    """Check the current status of embedding indexing"""
    db = next(get_db())
    
    try:
        # Get counts
        total_profiles = db.query(Profile).count()
        profiles_with_embeddings = db.query(ResearcherEmbedding).count()
        
        # Get model version distribution
        model_versions = db.query(ResearcherEmbedding.model_version).distinct().all()
        
        print(f"\n📊 Embedding Index Status")
        print(f"{'='*50}")
        print(f"Total Profiles: {total_profiles}")
        print(f"Profiles with Embeddings: {profiles_with_embeddings}")
        print(f"Profiles without Embeddings: {total_profiles - profiles_with_embeddings}")
        
        if total_profiles > 0:
            coverage = (profiles_with_embeddings / total_profiles) * 100
            print(f"Coverage: {coverage:.1f}%")
        
        if model_versions:
            print(f"\nModel Versions:")
            for (version,) in model_versions:
                count = db.query(ResearcherEmbedding).filter(
                    ResearcherEmbedding.model_version == version
                ).count()
                print(f"  - {version}: {count} profiles")
        
        print()
        
    finally:
        db.close()


def reindex_profiles(force=False, profile_id=None):
    """Reindex profiles"""
    if profile_id:
        print(f"🔄 Reindexing profile {profile_id}...")
        task = embed_profile.delay(profile_id)
        print(f"Task enqueued: {task.id}")
    else:
        print(f"🔄 Reindexing all profiles (force={force})...")
        task = reindex_all_profiles.delay(force=force)
        print(f"Bulk reindex task enqueued: {task.id}")
    
    print("Use 'embedding-cli status-task <task_id>' to check progress")


def check_task_status(task_id):
    """Check the status of a specific task"""
    result = celery_app.AsyncResult(task_id)
    
    print(f"\n📋 Task Status: {task_id}")
    print(f"{'='*50}")
    print(f"Status: {result.status}")
    print(f"Ready: {result.ready()}")
    
    if result.ready():
        print(f"Successful: {result.successful()}")
        if result.successful():
            print(f"Result: {result.result}")
        else:
            print(f"Error: {result.info}")
    else:
        print(f"Info: {result.info}")
    
    print()


def list_outdated_profiles():
    """List profiles that need embedding updates"""
    db = next(get_db())
    
    try:
        profiles = db.query(Profile).all()
        outdated_profiles = []
        
        for profile in profiles:
            existing_embedding = db.query(ResearcherEmbedding).filter(
                ResearcherEmbedding.user_id == profile.id
            ).first()
            
            if existing_embedding:
                should_recompute, current_hash = should_recompute_embedding(
                    profile, existing_embedding.text_sha256
                )
                if should_recompute:
                    outdated_profiles.append({
                        'id': profile.id,
                        'name': profile.name,
                        'email': profile.email,
                        'stored_hash': existing_embedding.text_sha256[:8] + '...',
                        'current_hash': current_hash[:8] + '...'
                    })
            else:
                outdated_profiles.append({
                    'id': profile.id,
                    'name': profile.name,
                    'email': profile.email,
                    'stored_hash': 'None',
                    'current_hash': 'New'
                })
        
        print(f"\n🔍 Outdated Profiles ({len(outdated_profiles)} found)")
        print(f"{'='*80}")
        
        if outdated_profiles:
            print(f"{'ID':<5} {'Name':<20} {'Email':<25} {'Stored Hash':<12} {'Current Hash'}")
            print(f"{'-'*80}")
            for profile in outdated_profiles:
                print(f"{profile['id']:<5} {profile['name'][:19]:<20} {profile['email'][:24]:<25} {profile['stored_hash']:<12} {profile['current_hash']}")
        else:
            print("All profiles are up-to-date! ✅")
        
        print()
        
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description='Manage researcher profile embeddings')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Check embedding index status')
    
    # Reindex command
    reindex_parser = subparsers.add_parser('reindex', help='Reindex profiles')
    reindex_parser.add_argument('--force', action='store_true', help='Force recompute all embeddings')
    reindex_parser.add_argument('--profile-id', type=int, help='Reindex specific profile ID')
    
    # Task status command
    task_parser = subparsers.add_parser('status-task', help='Check task status')
    task_parser.add_argument('task_id', help='Celery task ID')
    
    # Outdated command
    outdated_parser = subparsers.add_parser('outdated', help='List profiles needing updates')
    
    args = parser.parse_args()
    
    if args.command == 'status':
        check_embedding_status()
    elif args.command == 'reindex':
        reindex_profiles(force=args.force, profile_id=args.profile_id)
    elif args.command == 'status-task':
        check_task_status(args.task_id)
    elif args.command == 'outdated':
        list_outdated_profiles()
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
