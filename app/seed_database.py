import pandas as pd
from sqlalchemy import create_engine, text
import os
from sentence_transformers import SentenceTransformer


DATABASE_URL = "postgresql://rudradesai@localhost/matchmaking_db"
DATA_DIR = "data"
RAW_CSV_PATH = os.path.join(DATA_DIR, "Research Expertise Connector (Responses).csv")

df_original = pd.read_csv(RAW_CSV_PATH)
required_columns = [
    'Last Name, First Name', 'Email Address', 'Organization', 
    'Research Expertise to seek / share', 'Resource Type', 
    'Brief Description of Resource/Study', 'Section/Area/Research Areas'
]
df = df_original[required_columns].copy()
df.columns = [
    'name', 'email', 'organization', 'seek_share', 
    'resource_type', 'description', 'research_area'
]
df['primary_text'] = (df['research_area'].str.strip() + ' ' + df['description'].str.strip()).str.strip()

# --- 3. Generate Embeddings ---
print("Loading model and generating embeddings...")
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(df['primary_text'].tolist(), show_progress_bar=True)
df['embedding'] = list(embeddings)

#establishing DB connection
engine = create_engine(DATABASE_URL)

with engine.connect() as connection:
    connection.execute(text('DROP TABLE IF EXISTS profiles;'))
    connection.execute(test('DROP TABLE IF EXISTS users;'))

    connection.execute(text(
        '''
        CREATE TABLE users(
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL)
        '''
    ))
    print("Tables Users created")
    connection.execute(text(
        '''
CREATE TABLE profiles(
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
name TEXT,
organization TEXT,
seek_share TEXT,
resource_type TEXT,
description TEXT,
research_area TEXT,
primary_text TEXT,
embedding VECTOR (384))'''
    ))
    print("Table Profiled created")
    connection.commit()
    for _, rows in df.iterrows():
        user_insert_result = connection.execute(
            text("INSERT INTO users (email , hashed_password) VALUES(:email , :password) RETURNING id"),
            {'email' : rows['email'] , 'password' : "placeholder_password"}
        )
        user_id = user_insert_result.fetchone()[0]
        connection.execute(
            text(
                """
INSERT INTO profiles(name , user_id , organization, seek_share,  resource_type , description , research_area , primary_text, embedding)
VALUES(:name , :user_id , :organization, :seek_share , :resource_type , :description , :research_area , :primary_text , :embedding)"""
            ),
            {**rows.to_dict() , 'embedding' : str(list(rows['embedding']))}
        )
    connection.commit()

print("Success")

