from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL לא מוגדר ב-.env")
    return psycopg2.connect(db_url)

def add_guests_columns():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # הוסף עמודת contact_method (WhatsApp/SMS) - ברירת מחדל WhatsApp
        cur.execute("""
        ALTER TABLE guests
        ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT 'WhatsApp';
        """)

        # הוסף עמודת quantity (כמות) - ברירת מחדל 1
        cur.execute("""
        ALTER TABLE guests
        ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
        """)

        conn.commit()
        print("Added columns: contact_method (default: WhatsApp) and quantity (default: 1)")
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_guests_columns()
