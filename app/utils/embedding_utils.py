"""
Utilities for embedding computation and text processing
"""
import hashlib
import numpy as np
from typing import Optional
from sklearn.preprocessing import normalize

from app.database import Profile


def create_profile_text(profile: Profile) -> str:
    """
    Create a text representation of a profile for embedding computation.
    Based on the algorithm logic, this combines key profile fields.
    
    Args:
        profile: Profile database model instance
        
    Returns:
        str: Combined text for embedding
    """
    # Build text components (matching algorithm.py logic)
    text_parts = []
    
    # Add research area (primary field for matching)
    if profile.research_area:
        text_parts.append(f"Research Area: {profile.research_area}")
    
    # Add description/primary_text (main content)
    if profile.description:
        text_parts.append(f"Description: {profile.description}")
    elif profile.primary_text:
        text_parts.append(f"Research Focus: {profile.primary_text}")
    
    # Add resource type context
    if profile.resource_type:
        text_parts.append(f"Resource Type: {profile.resource_type}")
    
    # Add organization context
    if profile.organization:
        text_parts.append(f"Organization: {profile.organization}")
    
    # Add seek/share intent
    if profile.seek_share:
        text_parts.append(f"Intent: {profile.seek_share}")
    
    # Combine all parts
    combined_text = " | ".join(text_parts)
    
    # Fallback if no meaningful text
    if not combined_text.strip():
        combined_text = f"Researcher: {profile.name or 'Unknown'}"
    
    return combined_text


def normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    """
    Normalize embedding vector for consistent similarity computation
    
    Args:
        embedding: Raw embedding vector
        
    Returns:
        np.ndarray: L2 normalized embedding
    """
    # Ensure it's a numpy array
    if not isinstance(embedding, np.ndarray):
        embedding = np.array(embedding)
    
    # Reshape to 2D for sklearn normalize
    embedding_2d = embedding.reshape(1, -1)
    
    # L2 normalize
    normalized = normalize(embedding_2d, norm='l2')[0]
    
    return normalized


def compute_text_hash(text: str) -> str:
    """
    Compute SHA256 hash of text for change detection
    
    Args:
        text: Input text
        
    Returns:
        str: SHA256 hash in hexadecimal
    """
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def should_recompute_embedding(profile: Profile, existing_hash: Optional[str] = None) -> tuple[bool, str]:
    """
    Determine if embedding should be recomputed based on profile changes
    
    Args:
        profile: Profile instance
        existing_hash: Current stored hash (if any)
        
    Returns:
        tuple: (should_recompute: bool, current_hash: str)
    """
    profile_text = create_profile_text(profile)
    current_hash = compute_text_hash(profile_text)
    
    should_recompute = existing_hash != current_hash
    
    return should_recompute, current_hash
