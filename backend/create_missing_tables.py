"""
יצירת טבלאות חסרות - package_purchases ו-gifts
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

def create_missing_tables():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("Creating missing tables...")

        # טבלת package_purchases
        cur.execute("""
            CREATE TABLE IF NOT EXISTS package_purchases (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
                package_name TEXT NOT NULL,
                purchase_date TIMESTAMP DEFAULT NOW(),
                expiry_date TIMESTAMP,
                status TEXT DEFAULT 'active',
                event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
                purchased_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("✅ Created table: package_purchases")

        # טבלת gifts (מתנות כספיות)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS gifts (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
                amount DECIMAL(10, 2) NOT NULL,
                currency TEXT DEFAULT 'ILS',
                gift_date TIMESTAMP DEFAULT NOW(),
                payment_method TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("✅ Created table: gifts")

        conn.commit()
        cur.close()

        print("\n" + "="*60)
        print("✅ All missing tables created successfully!")
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
    create_missing_tables()
