import os
import psycopg2
from dotenv import load_dotenv

# טען משתני סביבה
load_dotenv()

def add_admin_columns():
    """הוספת עמודות מנהל לטבלת users"""
    conn = None
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cursor = conn.cursor()

        print("מוסיף עמודות מנהל לטבלת users...")

        # בדיקה אם העמודות כבר קיימות ותוספת רק אם לא
        cursor.execute("""
            DO $$
            BEGIN
                -- הוספת עמודת is_admin אם לא קיימת
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='users' AND column_name='is_admin'
                ) THEN
                    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
                    RAISE NOTICE 'עמודת is_admin נוספה בהצלחה';
                ELSE
                    RAISE NOTICE 'עמודת is_admin כבר קיימת';
                END IF;

                -- הוספת עמודת role אם לא קיימת
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='users' AND column_name='role'
                ) THEN
                    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
                    RAISE NOTICE 'עמודת role נוספה בהצלחה';
                ELSE
                    RAISE NOTICE 'עמודת role כבר קיימת';
                END IF;

                -- הוספת עמודת admin_verification_code אם לא קיימת
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='users' AND column_name='admin_verification_code'
                ) THEN
                    ALTER TABLE users ADD COLUMN admin_verification_code TEXT;
                    RAISE NOTICE 'עמודת admin_verification_code נוספה בהצלחה';
                ELSE
                    RAISE NOTICE 'עמודת admin_verification_code כבר קיימת';
                END IF;

                -- הוספת עמודת admin_verification_expires אם לא קיימת
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='users' AND column_name='admin_verification_expires'
                ) THEN
                    ALTER TABLE users ADD COLUMN admin_verification_expires TIMESTAMP;
                    RAISE NOTICE 'עמודת admin_verification_expires נוספה בהצלחה';
                ELSE
                    RAISE NOTICE 'עמודת admin_verification_expires כבר קיימת';
                END IF;
            END $$;
        """)

        conn.commit()
        print("All admin columns added/verified successfully!")

        cursor.close()

    except Exception as e:
        print(f"Error adding columns: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_admin_columns()
