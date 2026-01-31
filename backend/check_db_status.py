import os
import sys
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

# Manually load .env if not loaded (just in case)
if not os.getenv("DATABASE_URL"):
    print("WARNING: DATABASE_URL not found in env. Checking .env file...")
    try:
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    os.environ["DATABASE_URL"] = line.strip().split("=", 1)[1]
    except:
        pass

db_url = os.getenv("DATABASE_URL", "sqlite:///./interview_agent.db")
print(f"Checking Database: {db_url}")

try:
    engine = create_engine(db_url)
    connection = engine.connect()
    print("Connection Successful!")
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    if "interviews" in tables:
        columns = [c['name'] for c in inspector.get_columns("interviews")]
        print(f"Columns in 'interviews': {columns}")
        if "duration_seconds" not in columns:
            print("CRITICAL: 'duration_seconds' column MISSING in 'interviews' table!")
    else:
        print("CRITICAL: 'interviews' table MISSING!")

    if "resume_optimizations" in tables:
        print("'resume_optimizations' table exists.")
    else:
        print("CRITICAL: 'resume_optimizations' table MISSING!")

    connection.close()
except Exception as e:
    print(f"Connection Failed: {e}")
