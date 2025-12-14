"""
יצירת טבלת scheduled_messages לתזמון שליחת הזמנות
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

def create_scheduled_messages_table():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("Creating scheduled_messages table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
                message_type TEXT NOT NULL DEFAULT 'whatsapp',
                recipient_number TEXT NOT NULL,
                message_content TEXT NOT NULL,
                scheduled_time TIMESTAMP NOT NULL,
                status TEXT DEFAULT 'pending',
                sent_at TIMESTAMP,
                response_status TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        print("✅ scheduled_messages table created")

        # אינדקס לביצועים
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_scheduled_messages_event
            ON scheduled_messages(event_id);

            CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status
            ON scheduled_messages(status);

            CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_time
            ON scheduled_messages(scheduled_time);
        """)

        print("✅ Indexes created")

        conn.commit()
        cur.close()

        print("\n" + "="*60)
        print("✅ scheduled_messages table setup completed!")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_scheduled_messages_table()
