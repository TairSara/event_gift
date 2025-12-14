"""
סקריפט להוספת עמודות email verification לטבלת users
"""
import psycopg2
from db import get_db_connection

def add_email_verification_columns():
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("מוסיף עמודות email verification...")

        # הוספת עמודה email_verified (ברירת מחדל False)
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
        """)

        # הוספת עמודה verification_token
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS verification_token VARCHAR(10);
        """)

        # הוספת עמודה verification_token_expires
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
        """)

        conn.commit()
        print("SUCCESS: Columns added successfully!")

        # הצגת המבנה החדש
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """)

        columns = cur.fetchall()
        print("\nTable structure now:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]}) {'NULL' if col[2] == 'YES' else 'NOT NULL'} {f'DEFAULT {col[3]}' if col[3] else ''}")

    except Exception as e:
        print(f"ERROR: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    add_email_verification_columns()
