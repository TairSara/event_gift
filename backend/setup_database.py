"""
סקריפט מאוחד ליצירת כל הטבלאות הנדרשות במערכת
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

def setup_all_tables():
    """
    יוצר את כל הטבלאות והאינדקסים הנדרשים
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("🚀 Starting database setup...")

        # 1. טבלת משתמשים
        print("📋 Creating users table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                email_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(10),
                verification_token_expires TIMESTAMP,
                reset_token VARCHAR(6),
                reset_token_expires TIMESTAMP
            );
        """)
        print("   ✅ users table created")

        # 2. טבלת admins
        print("📋 Creating admins table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ admins table created")

        # 3. טבלת חבילות
        print("📋 Creating packages table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS packages (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                description TEXT,
                features TEXT[],
                max_guests INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ packages table created")

        # 4. טבלת אירועים
        print("📋 Creating events table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                package_id INTEGER REFERENCES packages(id),
                event_type TEXT NOT NULL,
                event_name TEXT NOT NULL,
                event_date DATE,
                event_time TIME,
                location TEXT,
                groom_name TEXT,
                bride_name TEXT,
                groom_father TEXT,
                bride_father TEXT,
                groom_mother TEXT,
                bride_mother TEXT,
                additional_info TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ events table created")

        # 5. טבלת מוזמנים
        print("📋 Creating guests table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS guests (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                full_name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                guests_count INTEGER DEFAULT 1,
                attendance_status TEXT DEFAULT 'pending',
                notes TEXT,
                group_name TEXT,
                invitation_sent BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ guests table created")

        # 6. טבלת התראות
        print("📋 Creating notifications table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ notifications table created")

        # 7. טבלת ניסיונות התחברות כושלים
        print("📋 Creating failed_login_attempts table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS failed_login_attempts (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                attempt_time TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ failed_login_attempts table created")

        # 8. טבלת נעילות חשבונות
        print("📋 Creating account_locks table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS account_locks (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                locked_until TIMESTAMP NOT NULL,
                lock_reason TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ account_locks table created")

        # 9. טבלת הודעות צור קשר
        print("📋 Creating contact_messages table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                subject TEXT,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'new',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        print("   ✅ contact_messages table created")

        # 10. יצירת אינדקסים לשיפור ביצועים
        print("📋 Creating indexes...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
            CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
            CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
        """)
        print("   ✅ indexes created")

        conn.commit()

        print("\n✅ Database setup completed successfully!")
        print("\n📊 Tables created:")
        print("   - users")
        print("   - admins")
        print("   - packages")
        print("   - events")
        print("   - guests")
        print("   - notifications")
        print("   - failed_login_attempts")
        print("   - account_locks")
        print("   - contact_messages")

        # הצגת סטטיסטיקות
        cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM users) as users_count,
                (SELECT COUNT(*) FROM admins) as admins_count,
                (SELECT COUNT(*) FROM packages) as packages_count,
                (SELECT COUNT(*) FROM events) as events_count,
                (SELECT COUNT(*) FROM guests) as guests_count;
        """)
        stats = cur.fetchone()

        print(f"\n📈 Current data:")
        print(f"   - Users: {stats[0]}")
        print(f"   - Admins: {stats[1]}")
        print(f"   - Packages: {stats[2]}")
        print(f"   - Events: {stats[3]}")
        print(f"   - Guests: {stats[4]}")

    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    setup_all_tables()
