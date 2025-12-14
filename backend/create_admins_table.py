import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def create_admins_table():
    """
    יצירת טבלת admins נפרדת לחלוטין מטבלת users
    """
    conn = None
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        print("=" * 60)
        print("Creating Separate ADMINS Table")
        print("=" * 60)

        # Drop existing table if exists (for clean slate)
        cursor.execute("DROP TABLE IF EXISTS admins CASCADE")
        print("Dropped old admins table (if existed)")

        # Create new admins table
        cursor.execute("""
            CREATE TABLE admins (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT DEFAULT 'super_admin',
                phone TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                admin_verification_code TEXT,
                admin_verification_expires TIMESTAMP
            )
        """)
        print("Created admins table successfully!")

        # Create index for faster lookups
        cursor.execute("""
            CREATE INDEX idx_admins_email ON admins(email)
        """)
        print("Created index on email")

        conn.commit()
        cursor.close()

        print("\n" + "=" * 60)
        print("SUCCESS! Admins table created")
        print("=" * 60)
        print("\nTable structure:")
        print("- id: Auto-incrementing primary key")
        print("- email: Unique admin email")
        print("- password: Bcrypt encrypted password")
        print("- full_name: Admin full name")
        print("- role: super_admin/finance/support")
        print("- phone: Optional phone number")
        print("- created_at: Registration timestamp")
        print("- last_login: Last login timestamp")
        print("- is_active: Can login or not")
        print("- admin_verification_code: 2FA code")
        print("- admin_verification_expires: Code expiry")
        print("=" * 60)
        print("\nNOTE: This table is COMPLETELY SEPARATE from 'users' table!")
        print("Admins do NOT appear in users table.")
        print("=" * 60)

    except Exception as e:
        print(f"\nError creating admins table: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_admins_table()
