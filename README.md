# Resource Matching Application

A comprehensive platform for matching researchers based on their profiles and research interests, featuring async offline embedding indexing for efficient similarity search.

## Features

- **User Authentication**: Secure registration and login system
- **Profile Management**: Complete researcher profile creation and editing
- **Intelligent Matching**: AI-powered matching using SentenceTransformer embeddings
- **Async Embedding Processing**: Background task processing with Celery + Redis
- **Match Management**: Save, view, and delete research matches
- **Admin Dashboard**: Administrative tools for embedding management
- **Modern UI**: Clean, responsive React frontend

## Architecture

### Backend (FastAPI)
- **Database**: PostgreSQL with pgvector extension for vector similarity search
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Task Queue**: Celery with Redis broker for async embedding computation
- **Embeddings**: SentenceTransformer models for semantic similarity

### Frontend (React)
- **Routing**: React Router for navigation
- **State Management**: Context API for authentication state
- **UI Components**: Modern, responsive design with card-based layouts

## Async Embedding System

The application features a comprehensive async embedding indexing system that automatically processes researcher profiles in the background:

### Key Components

1. **Automatic Processing**: Profile changes trigger embedding computation via database hooks
2. **Efficient Storage**: Embeddings stored in `researcher_embeddings` table with HNSW index
3. **Change Detection**: SHA256 hashing to skip unnecessary recomputations
4. **Model Versioning**: Support for embedding model upgrades
5. **Admin Tools**: CLI and web interface for bulk reindexing

### How It Works

1. **Profile Registration/Update** → Database commit triggers post-commit hook
2. **Task Enqueuing** → `embed_profile(user_id)` task added to Celery queue
3. **Background Processing** → Worker loads SentenceTransformer model and computes embedding
4. **Storage** → Normalized embedding stored with metadata (model version, hash, timestamp)
5. **Indexing** → HNSW index enables fast similarity search

## Installation & Setup

### Prerequisites

- Python 3.8+
- PostgreSQL with pgvector extension
- Redis server
- Node.js 16+

### Backend Setup

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd matchmaking
pip install -r requirements.txt
```

2. **Environment configuration:**
```bash
cp .env.example .env
# Edit .env with your database and Redis URLs
```

3. **Database setup:**
```bash
# Install pgvector extension in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

# Run migrations (if using Alembic)
alembic upgrade head
```

4. **Start services:**
```bash
# Terminal 1: Start FastAPI server
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start Celery worker
celery -A app.celery_app worker --loglevel=info --queues=embeddings

# Terminal 3: Start Redis (if not running as service)
redis-server
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Embedding Management

### CLI Tools

The application includes a comprehensive CLI for embedding management:

```bash
# Check embedding index status
python cli/embedding_cli.py status

# Reindex all profiles
python cli/embedding_cli.py reindex

# Force recompute all embeddings (for model upgrades)
python cli/embedding_cli.py reindex --force

# Reindex specific profile
python cli/embedding_cli.py reindex --profile-id 123

# Check task status
python cli/embedding_cli.py status-task <task-id>

# List outdated profiles
python cli/embedding_cli.py outdated
```

### Admin API Endpoints

- `GET /admin/embedding/stats` - Get embedding statistics
- `POST /admin/embedding/reindex` - Trigger bulk reindexing
- `POST /admin/embedding/profile/{profile_id}` - Reindex specific profile
- `GET /admin/embedding/task/{task_id}` - Check task status

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/matchmaking_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Embedding Model
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Database Schema

### Core Tables

- `users`: User authentication data
- `profiles`: Researcher profile information
- `researcher_embeddings`: Embedding vectors with metadata
- `saved_matches`: User's saved research matches

### Embedding Table Structure

```sql
CREATE TABLE researcher_embeddings (
    user_id INTEGER PRIMARY KEY REFERENCES profiles(id),
    embedding VECTOR(384) NOT NULL,
    model_version VARCHAR NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    text_sha256 VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for efficient similarity search
CREATE INDEX idx_researcher_embeddings_hnsw 
ON researcher_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Profiles
- `GET /profile/me` - Get current user profile
- `PUT /profile/me` - Update current user profile

### Matching
- `POST /api/match` - Find matches for user query
- `POST /matches/save/{profile_id}` - Save a match
- `GET /matches/saved` - Get saved matches
- `DELETE /matches/saved/{profile_id}` - Delete saved match

### Admin (requires admin privileges)
- `GET /admin/embedding/stats` - Embedding statistics
- `POST /admin/embedding/reindex` - Bulk reindexing
- `POST /admin/embedding/profile/{profile_id}` - Profile reindexing
- `GET /admin/embedding/task/{task_id}` - Task status

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
pytest

# Run embedding system tests specifically
pytest tests/test_embedding_system.py

# Run with coverage
pytest --cov=app tests/
```

## Performance Considerations

### Embedding Computation
- **Model Loading**: SentenceTransformer model loaded once per worker
- **Batch Processing**: Efficient batch embedding computation
- **Caching**: Hash-based change detection prevents unnecessary recomputation

### Database Optimization
- **HNSW Index**: Optimized for high-dimensional vector similarity search
- **Connection Pooling**: SQLAlchemy connection pooling for database efficiency
- **Async Processing**: Non-blocking embedding computation

### Scaling
- **Horizontal Scaling**: Multiple Celery workers can be deployed
- **Queue Management**: Separate queues for different task types
- **Model Versioning**: Support for gradual model upgrades

## Troubleshooting

### Common Issues

1. **Celery Worker Not Starting**
   - Check Redis connection
   - Verify Python path includes app directory
   - Check for import errors in task modules

2. **Embedding Tasks Failing**
   - Verify SentenceTransformer model download
   - Check database connectivity from worker
   - Review worker logs for specific errors

3. **Database Connection Issues**
   - Ensure pgvector extension is installed
   - Verify DATABASE_URL format
   - Check PostgreSQL service status

### Monitoring

- **Task Status**: Use CLI tools or admin API to monitor task progress
- **Database Stats**: Check embedding coverage and model versions
- **Worker Health**: Monitor Celery worker logs and Redis queues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details
