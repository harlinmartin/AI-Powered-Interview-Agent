import psycopg2
import os
from urllib.parse import urlparse

# Get DB URL from environment or hardcoded fallback
DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/interview_agent"

def fix_postgres_db():
    print(f"Connecting to PostgreSQL: {DATABASE_URL}")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT to_regclass('public.interviews');")
        if not cursor.fetchone()[0]:
            print("Table 'interviews' does not exist. It will be created by the app.")
            conn.close()
            return

        # Get current columns
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'interviews';")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
        # Add duration_seconds
        if 'duration_seconds' not in columns:
            print("Adding duration_seconds...")
            try:
                cursor.execute("ALTER TABLE interviews ADD COLUMN duration_seconds INTEGER DEFAULT 0")
            except Exception as e:
                print(f"Error adding duration_seconds: {e}")

        # Add feedback_result
        if 'feedback_result' not in columns:
            print("Adding feedback_result...")
            try:
                cursor.execute("ALTER TABLE interviews ADD COLUMN feedback_result TEXT")
            except Exception as e:
                print(f"Error adding feedback_result: {e}")

        # Add round_type
        if 'round_type' not in columns:
            print("Adding round_type...")
            try:
                cursor.execute("ALTER TABLE interviews ADD COLUMN round_type VARCHAR(255) DEFAULT 'Technical'")
            except Exception as e:
                print(f"Error adding round_type: {e}")

        # Add difficulty
        if 'difficulty' not in columns:
            print("Adding difficulty...")
            try:
                cursor.execute("ALTER TABLE interviews ADD COLUMN difficulty VARCHAR(255) DEFAULT 'Medium'")
            except Exception as e:
                print(f"Error adding difficulty: {e}")
                
        cursor.close()
        conn.close()
        print("PostgreSQL schema updated successfully.")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    fix_postgres_db()
