"""
Ensure guests table has status and attending_count columns
"""
import psycopg2
from db import get_db_connection

def ensure_columns():
    """Add status and attending_count columns if they don't exist"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Add status column
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='guests' AND column_name='status'
                ) THEN
                    ALTER TABLE guests ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
                END IF;
            END $$;
        """)

        # Add attending_count column
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='guests' AND column_name='attending_count'
                ) THEN
                    ALTER TABLE guests ADD COLUMN attending_count INTEGER DEFAULT 0;
                END IF;
            END $$;
        """)

        # Add updated_at column
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='guests' AND column_name='updated_at'
                ) THEN
                    ALTER TABLE guests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """)

        conn.commit()
        print("✅ Guest table columns ensured")

    except Exception as e:
        conn.rollback()
        print(f"⚠️ Warning ensuring columns: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    ensure_columns()
