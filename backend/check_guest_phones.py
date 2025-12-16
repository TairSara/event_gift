"""
בדיקת מספרי הטלפון של המוזמנים בטבלה
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

print("🔍 בודק מספרי טלפון של מוזמנים...\n")

cur.execute("""
    SELECT id, full_name, phone, whatsapp_number, event_id
    FROM guests
    ORDER BY id DESC
    LIMIT 10
""")

guests = cur.fetchall()

print(f"📋 נמצאו {len(guests)} מוזמנים אחרונים:\n")

for guest in guests:
    guest_id, name, phone, whatsapp, event_id = guest
    print(f"ID: {guest_id}")
    print(f"   שם: {name}")
    print(f"   טלפון: {phone}")
    print(f"   WhatsApp: {whatsapp}")
    print(f"   Event ID: {event_id}")
    print()

cur.close()
conn.close()
