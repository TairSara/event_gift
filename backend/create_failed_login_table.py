import psycopg2
from db import get_db_connection

def create_failed_login_attempts_table():
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Create failed_login_attempts table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS failed_login_attempts (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ip_address VARCHAR(50),
                attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT
            )
        """)

        # Create index for failed login attempts
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_email_time
            ON failed_login_attempts(email, attempt_time)
        """)

        # Create account_locks table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS account_locks (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                locked_until TIMESTAMP NOT NULL,
                lock_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create index for quick lookups
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_account_locks_email
            ON account_locks(email, locked_until)
        """)

        conn.commit()
        print("Failed login attempts and account locks tables created successfully!")

    except Exception as e:
        print(f"Error creating tables: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    create_failed_login_attempts_table()
