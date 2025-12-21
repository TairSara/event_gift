"""
Migration script to add status and attending_count columns to guests table
"""
import psycopg2
from db import get_db_connection

def add_status_columns():
    """Add status and attending_count columns to guests table"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("🔧 Adding status and attending_count columns to guests table...")

        # Add status column if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='guests' AND column_name='status'
                ) THEN
                    ALTER TABLE guests
                    ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

                    RAISE NOTICE 'Added status column';
                END IF;
            END $$;
        """)

        # Add attending_count column if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='guests' AND column_name='attending_count'
                ) THEN
                    ALTER TABLE guests
                    ADD COLUMN attending_count INTEGER DEFAULT 0;

                    RAISE NOTICE 'Added attending_count column';
                END IF;
            END $$;
        """)

        # Add updated_at column if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='guests' AND column_name='updated_at'
                ) THEN
                    ALTER TABLE guests
                    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

                    RAISE NOTICE 'Added updated_at column';
                END IF;
            END $$;
        """)

        conn.commit()

        print("✅ Successfully added status columns to guests table!")
        print("\nColumns added:")
        print("  - status (VARCHAR(20), default: 'pending')")
        print("  - attending_count (INTEGER, default: 0)")
        print("  - updated_at (TIMESTAMP, default: CURRENT_TIMESTAMP)")

        # Verify columns exist
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'guests'
            AND column_name IN ('status', 'attending_count', 'updated_at')
            ORDER BY column_name
        """)

        columns = cur.fetchall()
        if columns:
            print("\n✅ Verification - Columns found:")
            for col in columns:
                print(f"   {col[0]}: {col[1]} (default: {col[2]})")
        else:
            print("\n⚠️ Warning: Could not verify columns")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding columns: {str(e)}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_status_columns()
