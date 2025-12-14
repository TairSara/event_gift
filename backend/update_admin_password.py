import os
import psycopg2
import bcrypt
from dotenv import load_dotenv

load_dotenv()

def update_admin_password():
    """
    עדכון סיסמת המנהל
    """
    conn = None
    try:
        email = "savedayevents@gmail.com"
        new_password = "SaveDay2025"  # ללא ! בסוף

        print("=" * 60)
        print("Updating Admin Password")
        print("=" * 60)

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        # Hash the new password
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Update password
        cursor.execute(
            "UPDATE admins SET password = %s WHERE LOWER(email) = LOWER(%s)",
            (hashed, email)
        )
        conn.commit()

        print("\n" + "=" * 60)
        print("SUCCESS! Password updated")
        print("=" * 60)
        print(f"Email:    {email}")
        print(f"Password: {new_password}")
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
    update_admin_password()
