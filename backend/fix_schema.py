import sqlite3
import os

DB_FILES = ['/home/sayone-201/interview_agent/interview_agent.db']

def fix_db():
    target_db = None
    for f in DB_FILES:
        if os.path.exists(f):
            target_db = f
            break
            
    if not target_db:
        # Create it in current dir if not found
        target_db = 'interview_agent.db'
        print(f"DB not found, creating new: {target_db}")
        
    print(f"Fixing DB: {target_db}")
    
    conn = sqlite3.connect(target_db)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='interviews'")
    if not cursor.fetchone():
        print("Table 'interviews' does not exist. It will be created by the app.")
        conn.close()
        return

    # Get current columns
    cursor.execute("PRAGMA table_info(interviews)")
    columns = [info[1] for info in cursor.fetchall()]
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
            cursor.execute("ALTER TABLE interviews ADD COLUMN round_type TEXT DEFAULT 'Technical'")
        except Exception as e:
            print(f"Error adding round_type: {e}")

    # Add difficulty
    if 'difficulty' not in columns:
        print("Adding difficulty...")
        try:
            cursor.execute("ALTER TABLE interviews ADD COLUMN difficulty TEXT DEFAULT 'Medium'")
        except Exception as e:
            print(f"Error adding difficulty: {e}")
            
    conn.commit()
    conn.close()
    print("Database schema updated.")

if __name__ == "__main__":
    fix_db()
