from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL לא מוגדר ב-.env")
    return psycopg2.connect(db_url)

def init_packages_db():
    conn = get_db_connection()
    cur = conn.cursor()

    # טבלת חבילות (Packages)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT,
        price TEXT NOT NULL,
        price_unit TEXT NOT NULL,
        color TEXT,
        popular BOOLEAN DEFAULT FALSE,
        features JSONB,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    # טבלת רכישות חבילות (Package Purchases)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS package_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES packages(id),
        package_name TEXT NOT NULL,
        purchased_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'active'
    );
    """)

    # טבלת אירועים (Events)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        package_purchase_id INTEGER REFERENCES package_purchases(id),
        event_type TEXT NOT NULL,
        event_title TEXT NOT NULL,
        event_date TIMESTAMP,
        event_location TEXT,
        invitation_data JSONB,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """)

    # טבלת מוזמנים (Guests)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        attendance_status TEXT DEFAULT 'pending',
        table_number INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """)

    # טבלת מתנות (Gifts)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        guest_id INTEGER REFERENCES guests(id),
        amount DECIMAL(10, 2),
        message TEXT,
        gift_date TIMESTAMP DEFAULT NOW(),
        payment_status TEXT DEFAULT 'pending'
    );
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("OK - Tables created successfully (packages, purchases, events, guests, gifts)")

if __name__ == "__main__":
    init_packages_db()
