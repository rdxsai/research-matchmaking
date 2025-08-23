from sqlalchemy import ForeignKey, Column, Integer, String, Text, create_engine, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pgvector.sqlalchemy import Vector
from datetime import datetime

DATABASE_URL = "postgresql://rudradesai@localhost/matchmaking_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    seek_share = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    research_area = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")  # active or inactive

class SavedMatch(Base):
    __tablename__ = "saved_matches"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    matched_profile_id = Column(Integer, ForeignKey("profiles.id"))
    match_score = Column(String, nullable=True)  # Store the match score as string (e.g., "85%")

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True , index = True)
    name = Column(String , nullable = True)
    email = Column(String , nullable = True)
    organization = Column(String , nullable = True)
    seek_share = Column(String , nullable = True)
    resource_type = Column(String , nullable = True)
    description = Column(Text , nullable = True)
    research_area = Column(String , nullable = True)
    primary_text = Column(String , nullable = True)
    embedding = Column(Vector(384))
    status = Column(String, nullable=False, default="active")  # active or inactive
    
    # Proof of work fields for building trust
    h_index = Column(Integer, nullable=True)  # H-index metric
    citations = Column(Integer, nullable=True)  # Total citation count
    funding_summary = Column(Text, nullable=True)  # Summary of funding received
    
    # Relationship to embeddings
    researcher_embedding = relationship("ResearcherEmbedding", back_populates="profile", uselist=False)
    
    # Relationship to publications (one-to-many)
    publications = relationship("Publication", back_populates="profile", cascade="all, delete-orphan")


class Publication(Base):
    __tablename__ = "publications"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    journal = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    
    # Relationship back to profile
    profile = relationship("Profile", back_populates="publications")


class ResearcherEmbedding(Base):
    __tablename__ = "researcher_embeddings"
    
    user_id = Column(Integer, ForeignKey("profiles.id"), primary_key=True, index=True)
    embedding = Column(Vector(384), nullable=False)
    model_version = Column(String, nullable=False, default="all-MiniLM-L6-v2")
    text_sha256 = Column(String(64), nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to profile
    profile = relationship("Profile", back_populates="researcher_embedding")
    
    # HNSW index for efficient similarity search
    __table_args__ = (
        Index(
            "idx_researcher_embeddings_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"}
        ),
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()