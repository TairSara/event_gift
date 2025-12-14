import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_admin():
    """
    בדיקת פרטי המנהל בדאטבייס
    """
    conn = None
    try:
        email = "savedayevents@gmail.com"

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, email, full_name, is_admin, role, email_verified, created_at
            FROM users
            WHERE LOWER(email) = LOWER(%s)
            """,
            (email,)
        )
        user = cursor.fetchone()

        if user:
            print("=" * 60)
            print("Admin User Details")
            print("=" * 60)
            print(f"ID:             {user[0]}")
            print(f"Email:          {user[1]}")
            print(f"Full Name:      {user[2]}")
            print(f"Is Admin:       {user[3]}")
            print(f"Role:           {user[4]}")
            print(f"Email Verified: {user[5]}")
            print(f"Created At:     {user[6]}")
            print("=" * 60)
            print(f"Password:       [ENCRYPTED - bcrypt hash]")
            print("=" * 60)
            print("\nThis user is stored in the 'users' table.")
            print("The password is encrypted and cannot be read directly.")
            print("=" * 60)
        else:
            print(f"User {email} not found!")

        cursor.close()

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_admin()
