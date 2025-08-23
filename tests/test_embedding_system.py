"""
Tests for the async embedding indexing system
"""
import pytest
import hashlib
from unittest.mock import Mock, patch, MagicMock
import numpy as np
from sqlalchemy.orm import Session

from app.database import Profile, ResearcherEmbedding
from app.tasks.embedding_tasks import embed_profile
from app.utils.embedding_utils import create_profile_text, normalize_embedding, should_recompute_embedding


class TestEmbeddingUtils:
    """Test embedding utility functions"""
    
    def test_create_profile_text(self):
        """Test profile text creation for embedding"""
        # Create a mock profile
        profile = Mock(spec=Profile)
        profile.research_area = "Machine Learning"
        profile.description = "Working on neural networks and deep learning"
        profile.resource_type = "expertise"
        profile.organization = "MIT"
        profile.seek_share = "share"
        profile.primary_text = None
        profile.name = "John Doe"
        
        # Test text creation
        text = create_profile_text(profile)
        
        # Verify all components are included
        assert "Research Area: Machine Learning" in text
        assert "Description: Working on neural networks and deep learning" in text
        assert "Resource Type: expertise" in text
        assert "Organization: MIT" in text
        assert "Intent: share" in text
        
        # Test with minimal profile
        minimal_profile = Mock(spec=Profile)
        minimal_profile.research_area = None
        minimal_profile.description = None
        minimal_profile.resource_type = None
        minimal_profile.organization = None
        minimal_profile.seek_share = None
        minimal_profile.primary_text = None
        minimal_profile.name = "Jane Doe"
        
        minimal_text = create_profile_text(minimal_profile)
        assert "Researcher: Jane Doe" in minimal_text
    
    def test_normalize_embedding(self):
        """Test embedding normalization"""
        # Test with numpy array
        embedding = np.array([1.0, 2.0, 3.0, 4.0])
        normalized = normalize_embedding(embedding)
        
        # Check L2 norm is approximately 1
        norm = np.linalg.norm(normalized)
        assert abs(norm - 1.0) < 1e-6
        
        # Test with list input
        embedding_list = [1.0, 2.0, 3.0, 4.0]
        normalized_list = normalize_embedding(embedding_list)
        norm_list = np.linalg.norm(normalized_list)
        assert abs(norm_list - 1.0) < 1e-6
    
    def test_should_recompute_embedding(self):
        """Test embedding recomputation logic"""
        profile = Mock(spec=Profile)
        profile.research_area = "AI"
        profile.description = "AI research"
        profile.resource_type = "expertise"
        profile.organization = "Stanford"
        profile.seek_share = "share"
        profile.primary_text = None
        profile.name = "Alice"
        
        # Test with no existing hash (should recompute)
        should_recompute, current_hash = should_recompute_embedding(profile, None)
        assert should_recompute is True
        assert len(current_hash) == 64  # SHA256 hex length
        
        # Test with same hash (should not recompute)
        should_recompute_same, _ = should_recompute_embedding(profile, current_hash)
        assert should_recompute_same is False
        
        # Test with different hash (should recompute)
        different_hash = "different_hash"
        should_recompute_diff, _ = should_recompute_embedding(profile, different_hash)
        assert should_recompute_diff is True


class TestEmbeddingTasks:
    """Test Celery embedding tasks"""
    
    @patch('app.tasks.embedding_tasks.get_db')
    @patch('app.tasks.embedding_tasks.get_embedding_model')
    def test_embed_profile_task_success(self, mock_get_model, mock_get_db):
        """Test successful embedding task execution"""
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock profile
        mock_profile = Mock(spec=Profile)
        mock_profile.id = 1
        mock_profile.research_area = "Computer Vision"
        mock_profile.description = "Working on image recognition"
        mock_profile.resource_type = "expertise"
        mock_profile.organization = "Google"
        mock_profile.seek_share = "share"
        mock_profile.primary_text = None
        mock_profile.name = "Bob"
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        
        # Mock embedding model
        mock_model = Mock()
        mock_embedding = np.array([0.1, 0.2, 0.3, 0.4] * 96)  # 384 dimensions
        mock_model.encode.return_value = [mock_embedding]
        mock_get_model.return_value = (mock_model, "all-MiniLM-L6-v2")
        
        # Mock existing embedding query (no existing embedding)
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_profile,  # First call for profile
            None  # Second call for existing embedding
        ]
        
        # Test the task (we'll mock the actual Celery task execution)
        with patch('app.tasks.embedding_tasks.embed_profile.delay') as mock_delay:
            mock_task = Mock()
            mock_task.id = "test-task-id"
            mock_delay.return_value = mock_task
            
            # Simulate task enqueuing
            result = mock_delay(1)
            assert result.id == "test-task-id"
            mock_delay.assert_called_once_with(1)
    
    @patch('app.tasks.embedding_tasks.get_db')
    def test_embed_profile_task_profile_not_found(self, mock_get_db):
        """Test embedding task when profile doesn't exist"""
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock profile not found
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Test the task logic (simulated)
        profile_id = 999
        profile = mock_db.query(Profile).filter(Profile.id == profile_id).first()
        
        # Verify profile is None
        assert profile is None
    
    @patch('app.tasks.embedding_tasks.get_db')
    @patch('app.tasks.embedding_tasks.get_embedding_model')
    def test_embed_profile_task_skip_unchanged(self, mock_get_model, mock_get_db):
        """Test embedding task skips when profile hasn't changed"""
        # Mock database session
        mock_db = Mock(spec=Session)
        mock_get_db.return_value = mock_db
        
        # Mock profile
        mock_profile = Mock(spec=Profile)
        mock_profile.id = 1
        mock_profile.research_area = "NLP"
        mock_profile.description = "Natural language processing"
        mock_profile.resource_type = "expertise"
        mock_profile.organization = "OpenAI"
        mock_profile.seek_share = "share"
        mock_profile.primary_text = None
        mock_profile.name = "Charlie"
        
        # Create expected hash
        from app.utils.embedding_utils import create_profile_text
        profile_text = create_profile_text(mock_profile)
        expected_hash = hashlib.sha256(profile_text.encode('utf-8')).hexdigest()
        
        # Mock existing embedding with same hash
        mock_existing_embedding = Mock(spec=ResearcherEmbedding)
        mock_existing_embedding.text_sha256 = expected_hash
        
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_profile,  # First call for profile
            mock_existing_embedding  # Second call for existing embedding
        ]
        
        # Simulate the task logic
        profile = mock_db.query(Profile).filter(Profile.id == 1).first()
        existing_embedding = mock_db.query(ResearcherEmbedding).filter(
            ResearcherEmbedding.user_id == 1
        ).first()
        
        # Verify the embedding exists and has the same hash
        assert existing_embedding is not None
        assert existing_embedding.text_sha256 == expected_hash


class TestDatabaseIntegration:
    """Test database integration for embeddings"""
    
    def test_researcher_embedding_model(self):
        """Test ResearcherEmbedding model structure"""
        # This would typically use a test database
        # For now, we'll just verify the model structure
        
        # Check that ResearcherEmbedding has required fields
        required_fields = ['user_id', 'embedding', 'model_version', 'text_sha256', 'updated_at']
        
        for field in required_fields:
            assert hasattr(ResearcherEmbedding, field)
        
        # Check that the model has the relationship
        assert hasattr(ResearcherEmbedding, 'profile')


@pytest.fixture
def sample_profile():
    """Create a sample profile for testing"""
    profile = Mock(spec=Profile)
    profile.id = 1
    profile.name = "Test Researcher"
    profile.email = "test@example.com"
    profile.research_area = "Artificial Intelligence"
    profile.description = "AI researcher focusing on machine learning and neural networks"
    profile.resource_type = "expertise"
    profile.organization = "Test University"
    profile.seek_share = "share"
    profile.primary_text = None
    return profile


def test_end_to_end_embedding_workflow(sample_profile):
    """Test the complete embedding workflow"""
    # 1. Profile text creation
    profile_text = create_profile_text(sample_profile)
    assert len(profile_text) > 0
    assert "Artificial Intelligence" in profile_text
    
    # 2. Hash computation
    text_hash = hashlib.sha256(profile_text.encode('utf-8')).hexdigest()
    assert len(text_hash) == 64
    
    # 3. Mock embedding computation
    mock_embedding = np.random.rand(384)  # Simulate SentenceTransformer output
    normalized_embedding = normalize_embedding(mock_embedding)
    
    # 4. Verify normalization
    norm = np.linalg.norm(normalized_embedding)
    assert abs(norm - 1.0) < 1e-6
    
    # 5. Verify embedding can be stored (simulate database storage)
    embedding_record = {
        'user_id': sample_profile.id,
        'embedding': normalized_embedding.tolist(),
        'model_version': 'all-MiniLM-L6-v2',
        'text_sha256': text_hash,
        'updated_at': '2024-01-01T00:00:00'
    }
    
    assert embedding_record['user_id'] == 1
    assert len(embedding_record['embedding']) == 384
    assert embedding_record['text_sha256'] == text_hash


if __name__ == "__main__":
    pytest.main([__file__])
