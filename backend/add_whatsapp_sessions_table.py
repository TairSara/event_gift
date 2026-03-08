"""
Migration script to create whatsapp_sessions table.
Maps phone number -> guest_id + event_id so webhook can identify
which event a WhatsApp RSVP response belongs to.
"""

from db import get_db_connection


def create_whatsapp_sessions_table():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'whatsapp_sessions'
            );
        """)
        if cur.fetchone()[0]:
            print("whatsapp_sessions table already exists.")
            return

        print("Creating whatsapp_sessions table...")
        cur.execute("""
            CREATE TABLE whatsapp_sessions (
                phone VARCHAR(20) PRIMARY KEY,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        conn.commit()
        print("whatsapp_sessions table created successfully!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating whatsapp_sessions table: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    create_whatsapp_sessions_table()
