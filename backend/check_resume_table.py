import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

# Manually load .env if not loaded
if not os.getenv("DATABASE_URL"):
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
    inspector = inspect(engine)
    
    if "resume_optimizations" in inspector.get_table_names():
        columns = inspector.get_columns("resume_optimizations")
        print("\nColumns in 'resume_optimizations':")
        for c in columns:
            print(f"- {c['name']} ({c['type']})")
    else:
        print("\nCRITICAL: 'resume_optimizations' table DELETE/MISSING!")

except Exception as e:
    print(f"Connection Failed: {e}")
