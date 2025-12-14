"""
יצירת משתמש מנהל ראשי עם savedayevents@gmail.com
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import bcrypt
from db import get_db_connection

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_main_admin():
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # פרטי המנהל הראשי
        admin_email = "savedayevents@gmail.com"
        admin_password = "SaveTheDay2025!@#"  # סיסמה חזקה - שנה אותה אחרי ההתחברות הראשונה!
        admin_name = "Save The Day Admin"

        print(f"Creating main admin: {admin_email}")

        # בדיקה אם המנהל כבר קיים
        cur.execute(
            "SELECT id, email FROM admins WHERE LOWER(email) = LOWER(%s);",
            (admin_email,)
        )
        existing_admin = cur.fetchone()

        if existing_admin:
            print(f"⚠️  Admin already exists with ID: {existing_admin[0]}")

            # עדכון הסיסמה
            response = input("Do you want to reset the password? (yes/no): ")
            if response.lower() == 'yes':
                hashed_pw = hash_password(admin_password)
                cur.execute(
                    """
                    UPDATE admins
                    SET password = %s, is_active = TRUE
                    WHERE id = %s
                    """,
                    (hashed_pw, existing_admin[0])
                )
                conn.commit()
                print("✅ Password updated successfully!")
            else:
                print("❌ Operation cancelled")
            return

        # יצירת סיסמה מוצפנת
        hashed_pw = hash_password(admin_password)

        # הוספת המנהל לטבלה
        cur.execute(
            """
            INSERT INTO admins (email, password, full_name, role, is_active)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (admin_email, hashed_pw, admin_name, 'super_admin', True)
        )

        admin_id = cur.fetchone()[0]
        conn.commit()

        print("\n" + "="*60)
        print("✅ MAIN ADMIN CREATED SUCCESSFULLY!")
        print("="*60)
        print(f"Admin ID: {admin_id}")
        print(f"Email: {admin_email}")
        print(f"Password: {admin_password}")
        print(f"Role: super_admin")
        print("="*60)
        print("\n⚠️  IMPORTANT SECURITY NOTES:")
        print("1. Save this password in a secure location")
        print("2. Change the password after first login")
        print("3. Never share this password")
        print("4. This email is blocked from regular user registration")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    create_main_admin()
