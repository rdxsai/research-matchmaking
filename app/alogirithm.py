from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text
import numpy as np
import os

# --- 1. Load Model and Connect to DB ---
# These are loaded once when the FastAPI server starts.
DATABASE_URL = "postgresql://rudradesai@localhost/matchmaking_db"
engine = create_engine(DATABASE_URL)
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model and DB Engine loaded for matchmaking.")

def find_db_matches(user_query, user_intent, user_wants_resource_type, current_user_id=None):
    """
    Finds top matches by running a hybrid query against the PostgreSQL database.
    Intelligently excludes the current user from their own search results.
    
    Args:
        user_query: Search query text
        user_intent: 'seek' or 'share'
        user_wants_resource_type: Resource type filter
        current_user_id: ID of the current user (to exclude from results)
    """
    with engine.connect() as connection:
        # Generate the embedding for the user's query
        query_embedding = model.encode([user_query])[0]

        # Determine the opposite intent for the filter
        opposite_intent = 'share' if user_intent.lower() == 'seek' else 'seek'

        # Use a simple filter for resource_type for now
        # We can make this more complex later if needed
        resource_filter = user_wants_resource_type or ""

        # --- Build the Hybrid SQL Query with Intelligent Self-Exclusion ---
        base_conditions = [
            "seek_share ILIKE :opposite_intent",
            "resource_type ILIKE :resource_type_filter",
            "status = :status_filter"  # Only show active users in matches
        ]
        
        # Add intelligent self-exclusion filter
        query_params = {
            "query_embedding": str(list(query_embedding)),
            "opposite_intent": opposite_intent,
            "resource_type_filter": f"%{resource_filter}%",
            "status_filter": "active"  # Only match with active users
        }
        
        if current_user_id is not None:
            base_conditions.append("id != :current_user_id")
            query_params["current_user_id"] = current_user_id
        
        where_clause = " AND ".join(base_conditions)
        
        # Hybrid SQL Query: Use new async embeddings when available, fall back to old embeddings
        sql_query = text(f"""
            SELECT p.id, p.name, p.email, p.organization, p.research_area, p.primary_text, p.resource_type,
                   CASE 
                       WHEN re.embedding IS NOT NULL THEN 1 - (re.embedding <=> :query_embedding)
                       ELSE 1 - (p.embedding <=> :query_embedding)
                   END AS match_score,
                   CASE 
                       WHEN re.embedding IS NOT NULL THEN 'async'
                       ELSE 'legacy'
                   END AS embedding_source
            FROM profiles p
            LEFT JOIN researcher_embeddings re ON p.id = re.user_id
            WHERE {where_clause}
            AND (re.embedding IS NOT NULL OR p.embedding IS NOT NULL)
            ORDER BY 
                CASE 
                    WHEN re.embedding IS NOT NULL THEN re.embedding <=> :query_embedding
                    ELSE p.embedding <=> :query_embedding
                END
            LIMIT 5;
        """)

        # Execute the query and fetch the results
        results = connection.execute(sql_query, query_params).fetchall()

        # Convert the database rows into a list of dictionaries
        matches = [dict(row._mapping) for row in results]
        return matches