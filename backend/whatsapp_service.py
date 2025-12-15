"""
שירות WhatsApp באמצעות Gupshup WhatsApp Business API
שליחת הזמנות להזמנה לאירועים
"""
import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY", "sk_7c99c2f11f284370af9248ce40a4a7d9")
GUPSHUP_APP_NAME = os.getenv("GUPSHUP_APP_NAME", "saveday")
WHATSAPP_SENDER = os.getenv("WHATSAPP_SENDER_NUMBER", "972525869312")
WABA_ID = os.getenv("GUPSHUP_WABA_ID", "1216844380334963")


def send_invitation_whatsapp(recipient_number: str, event_data: dict, guest_data: dict):
    """
    שליחת הזמנה דרך WhatsApp (כרגע רק הודעת טקסט פשוטה)

    Args:
        recipient_number: מספר טלפון של המוזמן (בפורמט בינלאומי)
        event_data: מידע על האירוע
        guest_data: מידע על המוזמן

    Returns:
        dict: תשובה מה-API
    """

    # ניקוי מספר טלפון
    clean_number = recipient_number.replace(" ", "").replace("-", "").replace("+", "")

    if clean_number.startswith("0"):
        clean_number = "972" + clean_number[1:]
    elif not clean_number.startswith("972"):
        clean_number = "972" + clean_number

    # בניית הודעת ההזמנה
    event_type_hebrew = {
        'wedding': 'חתונה',
        'birthday': 'יום הולדת',
        'brit': 'ברית מילה',
        'brita': 'ברית בת',
        'bar-mitzvah': 'בר מצווה',
        'bat-mitzvah': 'בת מצווה',
        'hina': 'חינה',
        'knasim': 'כניסה לחופה',
        'other': 'אירוע'
    }.get(event_data.get('event_type'), 'אירוע')

    event_date = event_data.get('event_date', '')
    event_time = event_data.get('event_time', '')
    event_location = event_data.get('event_location') or event_data.get('location', '')
    guest_name = guest_data.get('full_name', 'אורח יקר')

    message_text = f"""🎉 הנכם מוזמנים! 🎉

שלום {guest_name},

אנו שמחים להזמינכם ל{event_type_hebrew}!

📅 תאריך: {event_date}
🕐 שעה: {event_time}
📍 מקום: {event_location}

{event_data.get('additional_info', '')}

נשמח לאישור הגעתכם 💙

נתראה!"""

    # Gupshup WhatsApp Business API
    url = f"https://partner.gupshup.io/partner/app/{WABA_ID}/msg"

    headers = {
        "Authorization": f"Bearer {GUPSHUP_API_KEY}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    payload = {
        "channel": "whatsapp",
        "source": WHATSAPP_SENDER,
        "destination": clean_number,
        "message": json.dumps({
            "type": "text",
            "text": message_text
        }),
        "src.name": GUPSHUP_APP_NAME
    }

    try:
        print(f"\n{'='*60}")
        print(f"🔄 Sending WhatsApp to {clean_number}")
        print(f"📡 URL: {url}")
        print(f"🔑 API Key: {GUPSHUP_API_KEY[:20]}...")
        print(f"📱 Source: {WHATSAPP_SENDER}")
        print(f"{'='*60}\n")

        response = requests.post(url, headers=headers, data=payload, timeout=30)

        print(f"✅ Response Status: {response.status_code}")
        print(f"📄 Response: {response.text}\n")

        if response.status_code == 200 or response.status_code == 202:
            try:
                result = response.json()
                return {
                    "success": True,
                    "message_id": result.get("messageId", "sent"),
                    "status": result.get("status", "sent"),
                    "response": result
                }
            except:
                return {
                    "success": True,
                    "message_id": "sent",
                    "status": "sent",
                    "response": {"raw": response.text}
                }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}"
            }

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }


def send_bulk_invitations(event_id: int, guests: list, event_data: dict):
    """
    שליחה המונית של הזמנות לכל האורחים
    """
    results = {
        "total": len(guests),
        "sent": 0,
        "failed": 0,
        "errors": []
    }

    for guest in guests:
        phone = guest.get('whatsapp_number') or guest.get('phone')

        if not phone:
            results["failed"] += 1
            results["errors"].append({
                "guest_id": guest.get('id'),
                "error": "No phone number"
            })
            continue

        result = send_invitation_whatsapp(phone, event_data, guest)

        if result.get("success"):
            results["sent"] += 1
        else:
            results["failed"] += 1
            results["errors"].append({
                "guest_id": guest.get('id'),
                "error": result.get("error")
            })

    return results


def handle_rsvp_response(guest_id: int, response: str):
    """
    טיפול בתגובת RSVP מהמוזמן
    """
    from db import get_db_connection

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE guests
            SET attendance_status = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (response, guest_id))

        conn.commit()
        cur.close()
        conn.close()

        return {"success": True}

    except Exception as e:
        print(f"Error updating RSVP: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return {"success": False, "error": str(e)}
