import psycopg2
import os
import sys
from dotenv import load_dotenv

# הגדרת קידוד UTF-8 לפלט
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def create_contact_messages_table():
    """
    יוצר טבלה לשמירת פניות צור קשר מהאתר
    """
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()

        # יצירת הטבלה
        cur.execute("""
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                subject VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP,
                notes TEXT
            )
        """)

        # יצירת אינדקס לסטטוס (לשאילתות מהירות)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_contact_messages_status
            ON contact_messages(status)
        """)

        # יצירת אינדקס לתאריך יצירה
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
            ON contact_messages(created_at DESC)
        """)

        conn.commit()
        print("✅ טבלת contact_messages נוצרה בהצלחה!")

        # בדיקה שהטבלה נוצרה
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'contact_messages'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        print("\nעמודות בטבלה:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ שגיאה ביצירת הטבלה: {e}")
        if conn:
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    create_contact_messages_table()
