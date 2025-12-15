"""
בדיקת שליחת הודעת WhatsApp ידנית (Gupshup Template)
"""

import sys
import io

# כדי שהעברית תודפס טוב ב-Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from whatsapp_service import send_invitation_whatsapp, normalize_il_phone


# נתוני בדיקה
test_event_data = {
    "id": 1,
    "event_type": "wedding",
    "event_title": "חתונת בדיקה",
    "event_name": "חתונת בדיקה",
    "event_date": "25/12/2025",
    "event_time": "18:00",
    "event_location": "אולם הזהב, תל אביב",
    "additional_info": "נשמח לראותכם!",
}

test_guest_data = {
    "id": 1,
    "full_name": "תאיר טובול",
    "phone": "+972538212446",
}


def main():
    raw_phone = test_guest_data["phone"]
    normalized_phone = normalize_il_phone(raw_phone)

    print("🔄 שולח הודעת בדיקה...")
    print(f"📱 לטלפון (מקורי): {raw_phone}")
    print(f"📱 לטלפון (מנורמל): {normalized_phone}")
    print(f"📋 אירוע: {test_event_data['event_title']}")
    print()

    try:
        result = send_invitation_whatsapp(
            recipient_number=raw_phone,   # אפשר לשלוח גם normalized_phone, השירות מנרמל לבד
            event_data=test_event_data,
            guest_data=test_guest_data,
        )

        print("=" * 60)
        if result.get("success"):
            print("✅ הבקשה נשלחה ל-Gupshup (submitted).")
            print(f"📬 Message ID: {result.get('message_id')}")
            print(f"📊 Status: {result.get('status')}")
            print(f"📄 Full Response: {result.get('response')}")
            print()
            print("ℹ️ אם לא התקבלה הודעה בוואטסאפ למרות submitted:")
            print("   1) בדקי שליחה דרך UI: Templates -> Test template (לאותו מספר).")
            print("   2) ודאי שהטמפלט הוא Media ושנשלח header נכון.")
            print("   3) ודאי שהמספר באמת עם WhatsApp ושלא חסם את העסק.")
        else:
            print("❌ השליחה נכשלה!")
            print(f"🔴 Error: {result.get('error')}")
        print("=" * 60)

    except Exception as e:
        print("=" * 60)
        print(f"❌ שגיאה חמורה: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
