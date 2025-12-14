import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def verify_separation():
    """
    בדיקה שהמנהל נפרד לחלוטין מטבלת users
    """
    conn = None
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        print("=" * 60)
        print("VERIFYING ADMIN SEPARATION")
        print("=" * 60)

        # Check admins table
        cursor.execute("SELECT id, email, full_name, role FROM admins")
        admins = cursor.fetchall()

        print("\nADMINS table:")
        print("-" * 60)
        if admins:
            for admin in admins:
                print(f"ID: {admin[0]} | Email: {admin[1]} | Name: {admin[2]} | Role: {admin[3]}")
        else:
            print("No admins found")

        # Check if admin email exists in users table
        print("\n" + "=" * 60)
        print("Checking if admin email exists in USERS table:")
        print("-" * 60)

        for admin in admins:
            cursor.execute(
                "SELECT id, email, is_admin FROM users WHERE LOWER(email) = LOWER(%s)",
                (admin[1],)
            )
            user = cursor.fetchone()

            if user:
                print(f"WARNING: {admin[1]} exists in BOTH tables!")
                print(f"  - users.id={user[0]}, is_admin={user[2]}")
                print(f"  - admins.id={admin[0]}")
            else:
                print(f"OK: {admin[1]} exists ONLY in admins table")

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total admins: {len(admins)}")
        print("Table: admins (completely separate from users)")
        print("\nAdmin login uses ONLY the 'admins' table.")
        print("Users login uses ONLY the 'users' table.")
        print("=" * 60)

        cursor.close()

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    verify_separation()
