"""
בדיקת שליחת הודעת WhatsApp ידנית
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from whatsapp_service import send_invitation_whatsapp

# נתוני בדיקה
test_event_data = {
    "id": 1,
    "event_type": "wedding",
    "event_title": "חתונת בדיקה",
    "event_name": "חתונת בדיקה",
    "event_date": "25/12/2025",
    "event_time": "18:00",
    "event_location": "אולם הזהב, תל אביב",
    "additional_info": "נשמח לראותכם!"
}

test_guest_data = {
    "id": 1,
    "full_name": "תאיר טובול",
"phone": "+972538212446"
}

print("🔄 שולח הודעת בדיקה...")
print(f"📱 לטלפון: {test_guest_data['phone']}")
print(f"📋 אירוע: {test_event_data['event_title']}")
print()

try:
    result = send_invitation_whatsapp(
        recipient_number=test_guest_data['phone'],
        event_data=test_event_data,
        guest_data=test_guest_data
    )

    print("="*60)
    if result.get("success"):
        print("✅ ההודעה נשלחה בהצלחה!")
        print(f"📬 Message ID: {result.get('message_id')}")
        print(f"📊 Status: {result.get('status')}")
        print(f"📄 Full Response: {result.get('response')}")
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
