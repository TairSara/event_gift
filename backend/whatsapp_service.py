"""
שירות WhatsApp באמצעות Ultramsg API
שליחת הזמנות עם כפתורים אינטראקטיביים
"""
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

ULTRAMSG_API_KEY = os.getenv("ULTRAMSG_API_KEY", "sk_7c99c2f11f284370af9248ce40a4a7d9")
ULTRAMSG_INSTANCE_ID = os.getenv("ULTRAMSG_INSTANCE_ID", "1216844380334963")
WHATSAPP_SENDER = os.getenv("WHATSAPP_SENDER_NUMBER", "+972525869312")

BASE_URL = f"https://api.ultramsg.com/{ULTRAMSG_INSTANCE_ID}"


def send_invitation_whatsapp(recipient_number: str, event_data: dict, guest_data: dict):
    """
    שליחת הזמנה דרך WhatsApp עם כפתורים אינטראקטיביים

    Args:
        recipient_number: מספר טלפון של המוזמן (בפורמט בינלאומי)
        event_data: מידע על האירוע
        guest_data: מידע על המוזמן

    Returns:
        dict: תשובה מה-API
    """

    # ניקוי מספר טלפון - הסרת רווחים ומקפים
    clean_number = recipient_number.replace(" ", "").replace("-", "")

    # אם המספר מתחיל ב-0, נחליף ל-972
    if clean_number.startswith("0"):
        clean_number = "972" + clean_number[1:]
    elif not clean_number.startswith("+"):
        if not clean_number.startswith("972"):
            clean_number = "972" + clean_number

    # הסרת + אם קיים
    clean_number = clean_number.replace("+", "")

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

    # פורמט תאריך בעברית
    event_date = event_data.get('event_date', '')
    event_time = event_data.get('event_time', '')
    event_location = event_data.get('event_location') or event_data.get('location', '')

    guest_name = guest_data.get('full_name', 'אורח יקר')

    message = f"""🎉 הנכם מוזמנים! 🎉

שלום {guest_name},

אנו שמחים להזמינכם ל{event_type_hebrew}!

📅 תאריך: {event_date}
🕐 שעה: {event_time}
📍 מקום: {event_location}

{event_data.get('additional_info', '')}

נשמח לאישור הגעתכם 💙

נתראה!
"""

    # שליחה עם כפתורים
    url = f"{BASE_URL}/messages/chat"

    payload = {
        "token": ULTRAMSG_API_KEY,
        "to": clean_number,
        "body": message,
        "priority": "10",
        "referenceId": f"event_{event_data.get('id')}_guest_{guest_data.get('id')}"
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        response = requests.post(url, data=payload, headers=headers)
        response.raise_for_status()

        result = response.json()

        # שליחת כפתורים RSVP
        send_rsvp_buttons(clean_number, event_data.get('id'), guest_data.get('id'))

        return {
            "success": True,
            "message_id": result.get("id"),
            "status": result.get("status"),
            "response": result
        }

    except requests.exceptions.RequestException as e:
        print(f"Error sending WhatsApp: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def send_rsvp_buttons(recipient_number: str, event_id: int, guest_id: int):
    """
    שליחת כפתורי RSVP (מגיע / לא מגיע)
    """
    url = f"{BASE_URL}/messages/chat"

    # יצירת כפתורים
    buttons_message = "אנא אשרו הגעתכם:"

    payload = {
        "token": ULTRAMSG_API_KEY,
        "to": recipient_number,
        "body": buttons_message,
        "priority": "10"
    }

    try:
        response = requests.post(url, data=payload)
        return response.json()
    except Exception as e:
        print(f"Error sending buttons: {e}")
        return None


def send_bulk_invitations(event_id: int, guests: list, event_data: dict):
    """
    שליחה המונית של הזמנות לכל האורחים

    Args:
        event_id: מזהה האירוע
        guests: רשימת אורחים
        event_data: מידע על האירוע

    Returns:
        dict: סיכום השליחה
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

    Args:
        guest_id: מזהה האורח
        response: 'confirmed' או 'declined'
    """
    from db import get_db_connection

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE guests
            SET attendance_status = %s
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
