import os
import psycopg2
import bcrypt
from dotenv import load_dotenv

# טען משתני סביבה
load_dotenv()

def create_admin_user():
    """
    יצירת משתמש מנהל ראשון במערכת
    """
    conn = None
    try:
        print("=" * 60)
        print("Creating Admin User for SaveDay Events")
        print("=" * 60)

        # קבלת פרטים מהמשתמש
        print("\nPlease enter admin details:")
        email = input("Email address: ").strip()
        password = input("Password (min 8 characters): ").strip()
        full_name = input("Full name: ").strip()

        # בדיקות בסיסיות
        if len(password) < 8:
            print("\nError: Password must be at least 8 characters long")
            return

        if not email or "@" not in email:
            print("\nError: Invalid email address")
            return

        # חיבור למסד נתונים
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        # בדיקה אם המשתמש כבר קיים
        cursor.execute(
            "SELECT id, email, is_admin FROM users WHERE LOWER(email) = LOWER(%s)",
            (email,)
        )
        existing_user = cursor.fetchone()

        if existing_user:
            user_id, user_email, is_admin = existing_user
            if is_admin:
                print(f"\nUser {user_email} is already an admin!")
                return

            # שדרוג משתמש קיים למנהל
            confirm = input(f"\nUser {user_email} exists. Upgrade to admin? (yes/no): ").strip().lower()
            if confirm == 'yes':
                cursor.execute(
                    """
                    UPDATE users
                    SET is_admin = TRUE, role = 'admin'
                    WHERE id = %s
                    """,
                    (user_id,)
                )
                conn.commit()
                print(f"\nSuccess! User {user_email} is now an admin.")
                cursor.close()
                return
            else:
                print("\nOperation cancelled.")
                return

        # hash הסיסמה
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # יצירת משתמש מנהל חדש
        cursor.execute(
            """
            INSERT INTO users
            (email, password, full_name, is_admin, role, email_verified, created_at)
            VALUES (%s, %s, %s, TRUE, 'admin', TRUE, NOW())
            RETURNING id, email
            """,
            (email, hashed_password, full_name)
        )

        new_user = cursor.fetchone()
        conn.commit()

        print("\n" + "=" * 60)
        print("SUCCESS! Admin user created:")
        print("=" * 60)
        print(f"ID:         {new_user[0]}")
        print(f"Email:      {new_user[1]}")
        print(f"Name:       {full_name}")
        print(f"Role:       admin")
        print(f"Verified:   Yes (email verified automatically)")
        print("=" * 60)
        print("\nYou can now login at: http://localhost:5173/admin/login")
        print("\nIMPORTANT: Keep your credentials safe!")
        print("=" * 60)

        cursor.close()

    except Exception as e:
        print(f"\nError creating admin user: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_admin_user()
