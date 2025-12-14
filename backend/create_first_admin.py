import os
import psycopg2
import bcrypt
from dotenv import load_dotenv

load_dotenv()

def create_first_admin():
    """
    יצירת מנהל ראשון בטבלת admins הנפרדת
    """
    conn = None
    try:
        # Admin credentials
        email = "savedayevents@gmail.com"
        password = "SaveDay2025!"
        full_name = "SaveDay Admin"
        phone = ""  # optional

        print("=" * 60)
        print("Creating First Admin in ADMINS table")
        print("=" * 60)

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute(
            "SELECT id, email FROM admins WHERE LOWER(email) = LOWER(%s)",
            (email,)
        )
        existing = cursor.fetchone()

        if existing:
            print(f"\nAdmin already exists!")
            print(f"ID: {existing[0]}")
            print(f"Email: {existing[1]}")
            cursor.close()
            return

        # Hash password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Insert admin
        cursor.execute("""
            INSERT INTO admins (email, password, full_name, role, phone, is_active)
            VALUES (%s, %s, %s, 'super_admin', %s, TRUE)
            RETURNING id, email
        """, (email, hashed, full_name, phone))

        new_admin = cursor.fetchone()
        conn.commit()

        print("\n" + "=" * 60)
        print("SUCCESS! Admin created in ADMINS table")
        print("=" * 60)
        print(f"ID:         {new_admin[0]}")
        print(f"Email:      {new_admin[1]}")
        print(f"Name:       {full_name}")
        print(f"Role:       super_admin")
        print(f"Table:      admins (NOT users!)")
        print("=" * 60)
        print("\nLogin credentials:")
        print(f"Email:      {email}")
        print(f"Password:   {password}")
        print("\nIMPORTANT: Save this password securely!")
        print("=" * 60)
        print("\nLogin URL: http://localhost:5173/admin/login")
        print("=" * 60)

        cursor.close()

    except Exception as e:
        print(f"\nError: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_first_admin()
