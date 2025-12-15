import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection
import traceback

try:
    conn = get_db_connection()
    cur = conn.cursor()

    # ניסיון להוסיף מוזמן
    print("מנסה להוסיף מוזמן לאירוע 3...")

    event_id = 3
    guest_name = "מוזמן בדיקה"
    phone = "0501234567"
    email = "test@example.com"
    guests_count = 2
    contact_method = "whatsapp"
    attendance_status = "pending"
    table_number = None

    cur.execute("""
        INSERT INTO guests (
            event_id, full_name, phone, email, guests_count,
            contact_method, attendance_status, table_number
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, created_at;
    """, (
        event_id,
        guest_name,
        phone,
        email,
        guests_count,
        contact_method,
        attendance_status,
        table_number
    ))

    guest_id, created_at = cur.fetchone()
    print(f"✅ המוזמן נוסף בהצלחה! ID={guest_id}")

    conn.rollback()  # לא שומרים בפועל

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ שגיאה:")
    print(traceback.format_exc())
