"""
הוספת עמודות למעקב אחר שליחת הזמנות ב-WhatsApp
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

def add_invitation_tracking_columns():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("Adding invitation tracking columns to guests table...")

        # בדיקה אם העמודות כבר קיימות
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'guests'
        """)
        existing_columns = {row[0] for row in cur.fetchall()}

        # הוספת invitation_sent_at אם לא קיים
        if 'invitation_sent_at' not in existing_columns:
            cur.execute("""
                ALTER TABLE guests
                ADD COLUMN invitation_sent_at TIMESTAMP
            """)
            print("✅ Added column: invitation_sent_at")
        else:
            print("ℹ️  Column invitation_sent_at already exists")

        # הוספת invitation_status אם לא קיים
        if 'invitation_status' not in existing_columns:
            cur.execute("""
                ALTER TABLE guests
                ADD COLUMN invitation_status TEXT DEFAULT 'not_sent'
            """)
            print("✅ Added column: invitation_status")
        else:
            print("ℹ️  Column invitation_status already exists")

        # הוספת whatsapp_number אם לא קיים (לטלפון נפרד עבור WhatsApp)
        if 'whatsapp_number' not in existing_columns:
            cur.execute("""
                ALTER TABLE guests
                ADD COLUMN whatsapp_number TEXT
            """)
            print("✅ Added column: whatsapp_number")
        else:
            print("ℹ️  Column whatsapp_number already exists")

        # הוספת updated_at אם לא קיים
        if 'updated_at' not in existing_columns:
            cur.execute("""
                ALTER TABLE guests
                ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
            """)
            print("✅ Added column: updated_at")
        else:
            print("ℹ️  Column updated_at already exists")

        # עדכון attendance_status להוסיף את סטטוס 'maybe'
        print("\nℹ️  Note: attendance_status column supports: 'pending', 'confirmed', 'declined', 'maybe'")

        conn.commit()
        cur.close()

        print("\n" + "="*60)
        print("✅ Invitation tracking columns setup completed!")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_invitation_tracking_columns()
