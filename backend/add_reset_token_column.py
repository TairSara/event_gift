from db import get_db_connection

def add_reset_token_column():
    """
    מוסיף עמודות לשמירת קוד איפוס סיסמה לטבלת users
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # הוספת עמודות אם הן לא קיימות
    cur.execute("""
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_token VARCHAR(6),
    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("OK - reset_token columns added to users table")

if __name__ == "__main__":
    add_reset_token_column()
