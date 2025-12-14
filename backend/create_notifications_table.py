import psycopg2
from db import get_db_connection

def create_notifications_table():
    """
    יוצר טבלת התראות במסד הנתונים
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Create notifications table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                event_id INTEGER,
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )
        """)

        # Create index for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id
            ON notifications(user_id)
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read
            ON notifications(user_id, is_read)
        """)

        conn.commit()
        print("Notifications table created successfully!")

    except Exception as e:
        print(f"Error creating notifications table: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    create_notifications_table()
