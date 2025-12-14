import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def remove_admin_from_users():
    """
    מחיקת המנהל מטבלת users (רק שם, לא מ-admins!)
    """
    conn = None
    try:
        email = "savedayevents@gmail.com"

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        print("=" * 60)
        print("Removing admin from USERS table")
        print("=" * 60)

        # Check if exists in users
        cursor.execute(
            "SELECT id, email FROM users WHERE LOWER(email) = LOWER(%s)",
            (email,)
        )
        user = cursor.fetchone()

        if user:
            print(f"\nFound in users table:")
            print(f"ID: {user[0]}, Email: {user[1]}")
            print("\nDeleting from users table...")

            cursor.execute(
                "DELETE FROM users WHERE id = %s",
                (user[0],)
            )
            conn.commit()

            print("DELETED successfully!")
        else:
            print(f"\n{email} NOT found in users table (already clean)")

        # Verify still in admins
        cursor.execute(
            "SELECT id, email FROM admins WHERE LOWER(email) = LOWER(%s)",
            (email,)
        )
        admin = cursor.fetchone()

        print("\n" + "=" * 60)
        print("VERIFICATION")
        print("=" * 60)

        if admin:
            print(f"OK: {email} still exists in ADMINS table")
            print(f"ID: {admin[0]}")
        else:
            print(f"ERROR: {email} NOT in admins table!")

        print("=" * 60)
        print("\nAdmin is now ONLY in 'admins' table, NOT in 'users'!")
        print("=" * 60)

        cursor.close()

    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    remove_admin_from_users()
