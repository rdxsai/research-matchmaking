"""
Celery configuration for async embedding tasks
"""
import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "matchmaking",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.embedding_tasks"]
)

from app.tasks import embedding_tasks

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=10 * 60,  # 10 minutes (reduced)
    task_soft_time_limit=8 * 60,  # 8 minutes (reduced)
    worker_prefetch_multiplier=1,  # Process one task at a time
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_default_retry_delay=30,  # 30 seconds (reduced)
    task_max_retries=2,  # Reduced retries
    worker_max_tasks_per_child=10,  # Restart worker after 10 tasks to prevent memory leaks
    worker_max_memory_per_child=200000,  # 200MB memory limit per worker
    task_routes={
        "app.tasks.embedding_tasks.embed_profile": {"queue": "embeddings"},
        # Remove bulk reindex task - too memory intensive
    },
)

# Task result expires in 1 hour
celery_app.conf.result_expires = 3600

if __name__ == "__main__":
    celery_app.start()
