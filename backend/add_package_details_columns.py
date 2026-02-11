"""
Add guest_count and payment_amount columns to package_purchases table
so users can see full package details (guest count, price paid)
"""
import psycopg2
from db import get_db_connection

def add_package_details_columns():
    """Add guest_count and payment_amount columns if they don't exist"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='package_purchases' AND column_name='guest_count'
                ) THEN
                    ALTER TABLE package_purchases ADD COLUMN guest_count TEXT;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='package_purchases' AND column_name='payment_amount'
                ) THEN
                    ALTER TABLE package_purchases ADD COLUMN payment_amount DECIMAL(10, 2);
                END IF;
            END $$;
        """)

        # Cleanup old pending/failed purchases (older than 1 hour)
        cur.execute("""
            DELETE FROM package_purchases
            WHERE status IN ('pending', 'failed')
            AND purchased_at < NOW() - INTERVAL '1 hour'
        """)
        deleted = cur.rowcount

        conn.commit()
        print("✅ guest_count and payment_amount columns added to package_purchases table")
        if deleted > 0:
            print(f"🧹 Cleaned up {deleted} old pending/failed purchases")

    except Exception as e:
        conn.rollback()
        print(f"⚠️ Warning adding package details columns: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_package_details_columns()
