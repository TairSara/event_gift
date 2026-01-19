"""
Migration script to add message scheduling columns to the events table
and create the scheduled_messages table for tracking sent messages.
"""

import psycopg2
from db import get_db_connection

def add_message_schedule_columns():
    """
    Add message_schedule column to events table (JSON format)
    Contains: schedule_type ('default' or 'custom'), days_before (array of integers)
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'message_schedule';
        """)

        if not cur.fetchone():
            print("Adding message_schedule column to events table...")
            cur.execute("""
                ALTER TABLE events
                ADD COLUMN message_schedule JSONB DEFAULT '{"schedule_type": "default", "days_before": [21, 14, 7]}'::jsonb;
            """)
            conn.commit()
            print("message_schedule column added successfully!")
        else:
            print("message_schedule column already exists.")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error adding message_schedule column: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def create_scheduled_messages_table():
    """
    Create scheduled_messages table to track:
    - Which messages are scheduled for which events
    - Which messages have been sent
    - Status of each scheduled message
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'scheduled_messages'
            );
        """)

        if not cur.fetchone()[0]:
            print("Creating scheduled_messages table...")
            cur.execute("""
                CREATE TABLE scheduled_messages (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                    message_number INTEGER NOT NULL,
                    scheduled_date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    sent_at TIMESTAMP,
                    guests_sent_count INTEGER DEFAULT 0,
                    guests_failed_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(event_id, message_number)
                );

                CREATE INDEX idx_scheduled_messages_date ON scheduled_messages(scheduled_date);
                CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);
                CREATE INDEX idx_scheduled_messages_event ON scheduled_messages(event_id);
            """)
            conn.commit()
            print("scheduled_messages table created successfully!")
        else:
            print("scheduled_messages table already exists.")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating scheduled_messages table: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def run_migrations():
    """Run all message scheduling migrations"""
    print("Running message scheduling migrations...")
    add_message_schedule_columns()
    create_scheduled_messages_table()
    print("All migrations completed!")


if __name__ == "__main__":
    run_migrations()
