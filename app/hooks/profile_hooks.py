"""
Database event hooks for automatic embedding task enqueuing
"""
import logging
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.database import Profile
from app.tasks.embedding_tasks import embed_profile

logger = logging.getLogger(__name__)


def enqueue_embedding_task(profile_id: int) -> None:
    """
    Enqueue embedding computation task for a profile
    
    Args:
        profile_id: Profile ID to process
    """
    try:
        # Enqueue the task asynchronously (non-blocking)
        task = embed_profile.delay(profile_id)
        logger.info(f"Enqueued embedding task {task.id} for profile {profile_id}")
    except Exception as e:
        logger.error(f"Failed to enqueue embedding task for profile {profile_id}: {str(e)}")


@event.listens_for(Profile, 'after_insert')
def profile_inserted(mapper, connection, target):
    """
    Handle profile insertion - enqueue embedding task
    """
    logger.info(f"Profile inserted: {target.id}")
    # Use after_bulk_insert to ensure the transaction is committed
    # We'll enqueue the task directly since the profile is already committed
    try:
        enqueue_embedding_task(target.id)
        logger.info(f"Embedding task enqueued for profile {target.id}")
    except Exception as e:
        logger.error(f"Failed to enqueue embedding task for profile {target.id}: {e}")


@event.listens_for(Profile, 'after_update')
def profile_updated(mapper, connection, target):
    """
    Handle profile update - enqueue embedding task if relevant fields changed
    """
    # Check if embedding-relevant fields were modified
    state = target.__dict__
    relevant_fields = ['research_area', 'description', 'primary_text', 'resource_type', 'organization', 'seek_share']
    
    # Check if any relevant fields were modified
    modified_relevant = any(
        hasattr(target, f'_{field}_changed') or 
        field in state.get('_sa_instance_state').committed_state
        for field in relevant_fields
    )
    
    if modified_relevant:
        logger.info(f"Profile updated with relevant changes: {target.id}")
        # Enqueue the task directly since the profile is already committed
        try:
            enqueue_embedding_task(target.id)
            logger.info(f"Embedding task enqueued for updated profile {target.id}")
        except Exception as e:
            logger.error(f"Failed to enqueue embedding task for updated profile {target.id}: {e}")
    else:
        logger.debug(f"Profile updated without relevant changes: {target.id}")


def register_profile_hooks():
    """
    Register all profile-related database hooks
    This should be called during application startup
    """
    logger.info("Profile database hooks registered")
    # The @event.listens_for decorators above automatically register the hooks
    pass
