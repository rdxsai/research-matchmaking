web: cd app && uvicorn main:app --host 0.0.0.0 --port $PORT
worker: cd app && celery -A celery_app worker --loglevel=info --queues=embeddings
