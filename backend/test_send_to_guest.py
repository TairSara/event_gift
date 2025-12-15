"""
בדיקה - שליחת הודעה לאורח אמיתי מהטבלה
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection
from whatsapp_service import send_invitation_whatsapp

# קבלת אורח מהטבלה
conn = get_db_connection()
cur = conn.cursor()

# בחירת אירוע ואורח לבדיקה
print("🔍 מחפש אירועים ומוזמנים בטבלה...")
print()

cur.execute("""
    SELECT e.id, e.event_title, e.event_type, e.event_date, e.event_time,
           e.event_location, e.additional_info
    FROM events e
    ORDER BY e.id DESC
    LIMIT 5
""")
events = cur.fetchall()

if not events:
    print("❌ לא נמצאו אירועים בטבלה!")
    conn.close()
    sys.exit(1)

print("📋 אירועים זמינים:")
for i, event in enumerate(events, 1):
    print(f"   {i}. Event ID: {event[0]} - {event[1]}")

selected_event = events[0]
event_id = selected_event[0]

print(f"\n✅ נבחר אירוע: {selected_event[1]} (ID: {event_id})")
print()

# קבלת מוזמנים לאירוע
cur.execute("""
    SELECT id, full_name, phone, whatsapp_number
    FROM guests
    WHERE event_id = %s AND (phone IS NOT NULL OR whatsapp_number IS NOT NULL)
    LIMIT 5
""", (event_id,))
guests = cur.fetchall()

if not guests:
    print(f"❌ לא נמצאו מוזמנים עם מספר טלפון לאירוע ID {event_id}!")
    conn.close()
    sys.exit(1)

print("👥 מוזמנים זמינים:")
for i, guest in enumerate(guests, 1):
    phone = guest[3] or guest[2]
    print(f"   {i}. {guest[1]} - {phone}")

selected_guest = guests[0]
print(f"\n✅ נבחר מוזמן: {selected_guest[1]}")
print()

# בניית נתוני האירוע
event_data = {
    "id": selected_event[0],
    "event_title": selected_event[1],
    "event_type": selected_event[2],
    "event_date": str(selected_event[3]) if selected_event[3] else "",
    "event_time": str(selected_event[4]) if selected_event[4] else "",
    "event_location": selected_event[5] or "",
    "additional_info": selected_event[6] or ""
}

# בניית נתוני האורח
guest_phone = selected_guest[3] or selected_guest[2]
guest_data = {
    "id": selected_guest[0],
    "full_name": selected_guest[1],
    "phone": guest_phone
}

conn.close()

print("="*60)
print("🚀 שולח הודעת WhatsApp")
print("="*60)
print(f"📱 מספר טלפון: {guest_phone}")
print(f"📋 אירוע: {event_data['event_title']}")
print(f"👤 מוזמן: {guest_data['full_name']}")
print()
print("⏳ שולח...")
print()

try:
    result = send_invitation_whatsapp(
        recipient_number=guest_phone,
        event_data=event_data,
        guest_data=guest_data
    )

    print("="*60)
    if result.get("success"):
        print("✅ ההודעה נשלחה בהצלחה!")
        print(f"📬 Message ID: {result.get('message_id')}")
        print(f"📊 Status: {result.get('status')}")
        print()
        print("🔔 המוזמן אמור לקבל הודעה עם 3 כפתורים:")
        print("   1️⃣ מאשר הגעה ✅")
        print("   2️⃣ לא מגיע ❌")
        print("   3️⃣ לא יודע כרגע ❓")
    else:
        print("❌ השליחה נכשלה!")
        print(f"🔴 Error: {result.get('error')}")
    print("="*60)

except Exception as e:
    print("="*60)
    print(f"❌ שגיאה חמורה: {e}")
    print("="*60)
    import traceback
    traceback.print_exc()
