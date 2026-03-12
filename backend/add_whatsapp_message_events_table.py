"""
Migration script to create whatsapp_message_events table.
Maps Gupshup messageId (gsId) -> event_id + guest_id so webhook can identify
which event a WhatsApp button press belongs to via context.gsId.
"""
from db import get_db_connection


def create_whatsapp_message_events_table():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'whatsapp_message_events'
            );
        """)
        if cur.fetchone()[0]:
            print("whatsapp_message_events table already exists.")
            return

        print("Creating whatsapp_message_events table...")
        cur.execute("""
            CREATE TABLE whatsapp_message_events (
                gs_id VARCHAR(100) PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        conn.commit()
        print("whatsapp_message_events table created successfully!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating whatsapp_message_events table: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    create_whatsapp_message_events_table()
