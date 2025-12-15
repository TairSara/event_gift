"""
שליחת הודעת WhatsApp ישירה למספר הטלפון שלך
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from whatsapp_service import send_invitation_whatsapp

# ===== שני את המספר הזה למספר שלך! =====
YOUR_PHONE_NUMBER = "972525869312"  # <-- שני כאן!
# ==========================================

# נתוני אירוע לבדיקה
event_data = {
    "id": 999,
    "event_type": "wedding",
    "event_title": "חתונה מיוחדת",
    "event_name": "חתונת שרה ודוד",
    "event_date": "31/12/2025",
    "event_time": "19:00",
    "event_location": "גן אירועים הדרים, תל אביב",
    "additional_info": "נשמח לראותכם בשמחתנו!"
}

# נתוני אורח לבדיקה
guest_data = {
    "id": 999,
    "full_name": "בדיקה - SaveDay Events",
    "phone": YOUR_PHONE_NUMBER
}

print("="*60)
print("🚀 שולח הודעת בדיקה ל-WhatsApp")
print("="*60)
print(f"📱 מספר טלפון: {YOUR_PHONE_NUMBER}")
print(f"📋 אירוע: {event_data['event_title']}")
print(f"👤 שם אורח: {guest_data['full_name']}")
print()
print("⏳ שולח...")
print()

try:
    result = send_invitation_whatsapp(
        recipient_number=YOUR_PHONE_NUMBER,
        event_data=event_data,
        guest_data=guest_data
    )

    print("="*60)
    if result.get("success"):
        print("✅ ההודעה נשלחה בהצלחה!")
        print(f"📬 Message ID: {result.get('message_id')}")
        print(f"📊 Status: {result.get('status')}")
        print()
        print("🔔 בדוק את הטלפון שלך - אמורה להגיע הודעה עם 3 כפתורים:")
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
