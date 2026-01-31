
import sqlite3
import os

DB_PATH = "interview_agent.db"

if not os.path.exists(DB_PATH):
    print(f"Error: {DB_PATH} not found in current directory.")
else:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check columns
    cursor.execute("PRAGMA table_info(interviews)")
    columns = [info[1] for info in cursor.fetchall()]
    print(f"Existing columns: {columns}")
    
    if "feedback_result" not in columns:
        print("Adding feedback_result...")
        try:
            cursor.execute("ALTER TABLE interviews ADD COLUMN feedback_result TEXT")
            print("Added feedback_result")
        except Exception as e:
            print(f"Error adding feedback_result: {e}")

    conn.commit()
    conn.close()
    print("Database fix (v2) complete.")
