from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL לא מוגדר ב-.env")
    return psycopg2.connect(db_url)

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    # יצירת טבלת users בסיסית
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("OK - users table created (or already exists)")

if __name__ == "__main__":
    init_db()
