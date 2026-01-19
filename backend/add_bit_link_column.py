"""
Add bit_payment_link column to events table for BIT payment links
"""
import psycopg2
from db import get_db_connection

def add_bit_link_column():
    """Add bit_payment_link column if it doesn't exist"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Add bit_payment_link column
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='events' AND column_name='bit_payment_link'
                ) THEN
                    ALTER TABLE events ADD COLUMN bit_payment_link VARCHAR(500);
                END IF;
            END $$;
        """)

        conn.commit()
        print("✅ bit_payment_link column added to events table")

    except Exception as e:
        conn.rollback()
        print(f"⚠️ Warning adding bit_payment_link column: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_bit_link_column()
