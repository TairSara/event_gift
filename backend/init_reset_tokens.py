from db import get_db_connection

def init_reset_tokens_table():
    """
    יוצר טבלת reset_tokens לשמירת קודי איפוס סיסמה
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE
    );
    """)

    # יצירת אינדקס לחיפוש מהיר
    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON reset_tokens(user_id);
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("OK - reset_tokens table created (or already exists)")

if __name__ == "__main__":
    init_reset_tokens_table()
