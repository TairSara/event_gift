"""
Add message_settings JSONB column to events table
This stores custom WhatsApp/SMS message field values per event
"""
from db import get_db_connection


def add_message_settings_column():
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'message_settings';
        """)

        if not cur.fetchone():
            print("Adding message_settings column to events table...")
            cur.execute("""
                ALTER TABLE events
                ADD COLUMN message_settings JSONB DEFAULT '{}'::jsonb;
            """)
            conn.commit()
            print("✅ message_settings column added successfully!")
        else:
            print("message_settings column already exists.")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error adding message_settings column: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    add_message_settings_column()
