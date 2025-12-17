"""
הוספת עמודת phone לטבלת users
"""

import os
import psycopg2
from dotenv import load_dotenv

# טעינת משתני סביבה
load_dotenv()

def get_db_connection():
    """יוצר חיבור למסד הנתונים"""
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def add_phone_column():
    """
    מוסיף עמודת phone לטבלת users אם היא לא קיימת
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקה אם העמודה כבר קיימת
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='users' AND column_name='phone';
        """)

        if cur.fetchone():
            print("[INFO] עמודת phone כבר קיימת בטבלה")
            return

        # הוספת העמודה
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN phone VARCHAR(20);
        """)

        conn.commit()
        print("[SUCCESS] עמודת phone נוספה בהצלחה לטבלת users")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[ERROR] שגיאה בהוספת עמודת phone: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    print("[*] מוסיף עמודת phone לטבלת users...\n")
    add_phone_column()
