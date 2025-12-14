"""
בודק את הטבלאות ב-DB ומציג את המבנה שלהן
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

def check_tables():
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקת טבלאות קיימות
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)

        tables = cur.fetchall()
        print(f"✅ Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table[0]}")

        # בדיקת מבנה טבלת users
        print("\n📋 Users table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """)

        columns = cur.fetchall()
        for col in columns:
            nullable = 'NULL' if col[2] == 'YES' else 'NOT NULL'
            default = f" DEFAULT {col[3]}" if col[3] else ""
            print(f"   - {col[0]} ({col[1]}) {nullable}{default}")

        # בדיקת נתונים בטבלת users
        cur.execute("SELECT COUNT(*) FROM users;")
        user_count = cur.fetchone()[0]
        print(f"\n👥 Total users: {user_count}")

        if user_count > 0:
            cur.execute("""
                SELECT id, email, full_name, email_verified, created_at
                FROM users
                LIMIT 5;
            """)
            users = cur.fetchall()
            print("\nFirst 5 users:")
            for user in users:
                verified = "✓" if user[3] else "✗"
                print(f"   [{user[0]}] {user[1]} - {user[2]} - Verified: {verified}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    check_tables()
