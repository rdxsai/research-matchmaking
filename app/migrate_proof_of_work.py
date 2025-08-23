"""
Database migration script to add proof of work fields to existing profiles
and populate dummy data for existing users.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from database import get_db, Profile, Publication
import random

# Sample dummy data for existing users
DUMMY_FUNDING_SUMMARIES = [
    "NSF Grant #1234567 ($250,000, 2020-2023): Development of novel machine learning algorithms for healthcare applications.",
    "NIH R01 Grant ($450,000, 2019-2024): Investigating the role of AI in personalized medicine and patient outcomes.",
    "DOE Grant #DE-SC0012345 ($180,000, 2021-2024): Advanced computational methods for renewable energy optimization.",
    "DARPA Contract ($320,000, 2020-2023): Cybersecurity applications of quantum computing and cryptography.",
    "Industry Partnership with Google ($150,000, 2022-2025): Collaborative research on natural language processing.",
]

DUMMY_PUBLICATIONS = [
    ("Machine Learning Approaches to Healthcare Data Analysis", "Nature Medicine", 2023),
    ("Novel Algorithms for Distributed Computing Systems", "IEEE Transactions on Computers", 2022),
    ("Quantum Computing Applications in Cryptography", "Science", 2023),
    ("Deep Learning for Medical Image Analysis", "The Lancet Digital Health", 2022),
    ("Sustainable Energy Systems: A Computational Approach", "Nature Energy", 2023),
    ("Cybersecurity in the Age of IoT: Challenges and Solutions", "ACM Computing Surveys", 2022),
    ("Natural Language Processing for Clinical Decision Support", "Journal of Medical Internet Research", 2023),
    ("Blockchain Technology for Secure Data Sharing", "IEEE Security & Privacy", 2022),
    ("AI Ethics and Fairness in Healthcare Applications", "AI & Society", 2023),
    ("Optimization Algorithms for Smart Grid Management", "IEEE Transactions on Smart Grid", 2022),
]

def migrate_database():
    """Add proof of work fields to existing profiles and populate with dummy data."""
    
    print("Starting database migration for proof of work fields...")
    
    # Get database connection
    db = next(get_db())
    engine = db.bind
    
    try:
        # Add new columns to profiles table
        print("Adding new columns to profiles table...")
        
        # Check if columns already exist
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'profiles' AND column_name IN ('h_index', 'citations', 'funding_summary')
            """)).fetchall()
            
            existing_columns = [row[0] for row in result]
            
            if 'h_index' not in existing_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN h_index INTEGER"))
                connection.commit()
                print("Added h_index column")
            
            if 'citations' not in existing_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN citations INTEGER"))
                connection.commit()
                print("Added citations column")
            
            if 'funding_summary' not in existing_columns:
                connection.execute(text("ALTER TABLE profiles ADD COLUMN funding_summary TEXT"))
                connection.commit()
                print("Added funding_summary column")
            
            # Create publications table if it doesn't exist
            print("Creating publications table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS publications (
                    id SERIAL PRIMARY KEY,
                    profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
                    title VARCHAR NOT NULL,
                    journal VARCHAR,
                    year INTEGER
                )
            """))
            connection.commit()
        print("Publications table created/verified")
        
        # Get all existing profiles
        profiles = db.query(Profile).all()
        print(f"Found {len(profiles)} existing profiles to update")
        
        # Update existing profiles with dummy data
        for i, profile in enumerate(profiles):
            if profile.h_index is None:  # Only update if not already set
                # Generate realistic dummy data based on profile
                h_index = random.randint(5, 25)
                citations = random.randint(50, 500)
                funding_summary = random.choice(DUMMY_FUNDING_SUMMARIES)
                
                # Update profile
                profile.h_index = h_index
                profile.citations = citations
                profile.funding_summary = funding_summary
                
                # Add 1-3 dummy publications
                num_publications = random.randint(1, 3)
                for j in range(num_publications):
                    pub_data = random.choice(DUMMY_PUBLICATIONS)
                    publication = Publication(
                        profile_id=profile.id,
                        title=pub_data[0],
                        journal=pub_data[1],
                        year=pub_data[2]
                    )
                    db.add(publication)
                
                print(f"Updated profile {i+1}/{len(profiles)}: {profile.name} (h-index: {h_index}, citations: {citations})")
        
        # Commit all changes
        db.commit()
        print("✅ Database migration completed successfully!")
        print(f"Updated {len(profiles)} profiles with proof of work data")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_database()
