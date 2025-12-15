import os
import re
import json
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

# =========================
# CONFIG
# =========================
GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY")  # חובה ב-.env
GUPSHUP_APP_NAME = os.getenv("GUPSHUP_APP_NAME", "saveday")
WHATSAPP_SENDER = os.getenv("WHATSAPP_SENDER_NUMBER", "972525869312")
TEMPLATE_NAME = os.getenv("WHATSAPP_TEMPLATE_NAME", "event_invitation_new")

# Media header (התמונה שתצורפי ב-Header של הטמפלט)
# בפועל את יכולה להעביר URL דינמי לכל שליחה, אבל זה fallback.
HEADER_TYPE = os.getenv("WHATSAPP_TEMPLATE_HEADER_TYPE", "image")  # image|document|video
HEADER_MEDIA_URL = os.getenv(
    "WHATSAPP_TEMPLATE_HEADER_MEDIA_URL",
    "https://i.imgur.com/9Q5Z6Zr.png"
)

# Endpoints
TEMPLATE_URL = "https://api.gupshup.io/wa/api/v1/template/msg"
SESSION_URL = "https://api.gupshup.io/wa/api/v1/msg"


def _require_api_key():
    if not GUPSHUP_API_KEY or not GUPSHUP_API_KEY.strip():
        raise RuntimeError("❌ חסר GUPSHUP_API_KEY בקובץ .env")


def normalize_il_phone(phone: str) -> str:
    """
    מנרמל מספר ישראלי לפורמט: +972...
    קלט אפשרי: 053..., +972..., 972...
    """
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("0"):
        digits = "972" + digits[1:]
    elif not digits.startswith("972"):
        digits = "972" + digits
    # Gupshup דורש + לפני קידומת המדינה
    return "+" + digits


def event_type_to_hebrew(event_type: str) -> str:
    return {
        "wedding": "חתונה",
        "birthday": "יום הולדת",
        "brit": "ברית מילה",
        "brita": "ברית בת",
        "bar-mitzvah": "בר מצווה",
        "bat-mitzvah": "בת מצווה",
        "hina": "חינה",
        "knasim": "כניסה לחופה",
        "other": "אירוע",
    }.get(event_type, "אירוע")


def _safe_update_guest_state(guest_id: int, state: str):
    """
    עדכון state ב-DB - לא מפיל את השליחה אם DB נופל
    """
    if not guest_id:
        return
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE guests
            SET conversation_state = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (state, guest_id),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️ DB update skipped (not blocking): {e}")


def send_invitation_whatsapp(
    recipient_number: str,
    event_data: dict,
    guest_data: dict,
    image_url: str | None = None,
):
    """
    שליחת הזמנה דרך WhatsApp Template (Media)
    - מנסה 2 פורמטים של header כדי להתאים לחשבונות שונים ב-Gupshup
    """
    _require_api_key()

    clean_number = normalize_il_phone(recipient_number)

    # נתוני אירוע/אורח
    event_type_he = event_type_to_hebrew(event_data.get("event_type"))
    event_date = str(event_data.get("event_date", "")).strip()
    event_time = str(event_data.get("event_time", "")).strip()
    event_location = (event_data.get("event_location") or event_data.get("location") or "").strip()
    guest_name = (guest_data.get("full_name") or "אורח יקר").strip()

    template_params = [
        guest_name,       # {{1}}
        event_type_he,    # {{2}}
        event_date,       # {{3}}
        event_time,       # {{4}}
        event_location,   # {{5}}
    ]

    media = image_url or HEADER_MEDIA_URL

    headers = {
        "apikey": GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    # --- ניסיון 1: header עם link (הנפוץ ביותר למדיה templates) ---
    template_obj_1 = {
        "id": TEMPLATE_NAME,
        "params": template_params,
        "header": {
            "type": "image",
            "link": media,
        },
    }

    # --- ניסיון 2: header.image.link (פורמט אחר) ---
    template_obj_2 = {
        "id": TEMPLATE_NAME,
        "params": template_params,
        "header": {
            "type": "image",
            "image": {"link": media},
        },
    }

    # --- ניסיון 3: header.media (פורמט נוסף) ---
    template_obj_3 = {
        "id": TEMPLATE_NAME,
        "params": template_params,
        "header": {
            "type": "image",
            "media": media,
        },
    }

    for attempt, template_obj in enumerate([template_obj_1, template_obj_2, template_obj_3], start=1):
        payload = {
            "source": WHATSAPP_SENDER,
            "destination": clean_number,
            "template": json.dumps(template_obj, ensure_ascii=False),
            "src.name": GUPSHUP_APP_NAME,
        }

        print("\n" + "=" * 60)
        print(f"🔄 Attempt #{attempt} sending Template to {clean_number}")
        print(f"📡 Template: {TEMPLATE_NAME}")
        print(f"🖼️ Media: {media}")
        print(f"📋 Params: {template_params}")
        print("=" * 60 + "\n")

        try:
            resp = requests.post(TEMPLATE_URL, headers=headers, data=payload, timeout=30)
        except Exception as e:
            return {"success": False, "error": f"Request error: {e}"}

        print(f"✅ Response Status: {resp.status_code}")
        print(f"📄 Response: {resp.text}\n")

        if resp.status_code in (200, 202):
            try:
                data = resp.json()
            except Exception:
                data = {"raw": resp.text}

            # DB state update (לא חוסם)
            _safe_update_guest_state(guest_data.get("id"), "waiting_for_rsvp")

            return {
                "success": True,
                "attempt_used": attempt,
                "message_id": data.get("messageId") or data.get("message_id") or "sent",
                "status": data.get("status") or "submitted",
                "response": data,
            }

    return {"success": False, "error": "All header formats failed (no 200/202)"}


def send_follow_up_message(recipient_number: str, message: str) -> bool:
    """
    הודעת המשך (Session message / free text).
    עובד רק אם יש חלון 24 שעות פתוח עם המשתמש.
    """
    _require_api_key()

    clean_number = normalize_il_phone(recipient_number)

    headers = {
        "apikey": GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    payload = {
        "channel": "whatsapp",
        "source": WHATSAPP_SENDER,
        "destination": clean_number,
        "message": json.dumps({"type": "text", "text": message}, ensure_ascii=False),
        "src.name": GUPSHUP_APP_NAME,
    }

    try:
        resp = requests.post(SESSION_URL, headers=headers, data=payload, timeout=30)
        print(f"Follow-up: {resp.status_code} - {resp.text}")
        return resp.status_code in (200, 202)
    except Exception as e:
        print(f"Error sending follow-up: {e}")
        return False


def send_bulk_invitations(event_id: int, guests_list: list, event_data: dict):
    """
    שליחת הזמנות לרשימת אורחים
    """
    results = []
    for guest in guests_list:
        try:
            result = send_invitation_whatsapp(
                recipient_number=guest.get("whatsapp_number") or guest.get("phone"),
                event_data=event_data,
                guest_data=guest
            )
            results.append({
                "guest_id": guest["id"],
                "guest_name": guest["full_name"],
                "success": result.get("success"),
                "message_id": result.get("message_id"),
                "error": result.get("error")
            })
        except Exception as e:
            results.append({
                "guest_id": guest["id"],
                "guest_name": guest["full_name"],
                "success": False,
                "error": str(e)
            })
    return results


def handle_rsvp_response(guest_id: int, response: str, phone: str):
    """טיפול בתגובת RSVP מהמוזמן"""
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE guests
            SET attendance_status = %s,
                conversation_state = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (response,
              'waiting_for_guests_count' if response == 'confirmed' else 'done',
              guest_id))

        conn.commit()
        cur.close()
        conn.close()

        # שליחת הודעת המשך
        if response == 'confirmed':
            send_follow_up_message(
                phone,
                "תודה על האישור! 🎉\n\nכמה אורחים יגיעו? (הזינו מספר בלבד)"
            )
        elif response == 'declined':
            send_follow_up_message(
                phone,
                "תודה על העדכון 💙\n\nנשמח לראותכם בהזדמנות הבאה!"
            )
        else:  # maybe
            send_follow_up_message(
                phone,
                "תודה! נשמח אם תוכלו לעדכן אותנו כשתדעו 💙"
            )

        return {"success": True}

    except Exception as e:
        print(f"Error handling RSVP: {e}")
        return {"success": False, "error": str(e)}


def handle_text_message(phone: str, text: str):
    """טיפול בהודעת טקסט מהמוזמן (מספר אורחים)"""
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()

        # מציאת האורח
        cur.execute("""
            SELECT id, conversation_state FROM guests
            WHERE phone = %s OR whatsapp_number = %s
            ORDER BY updated_at DESC
            LIMIT 1
        """, (phone, phone))

        guest = cur.fetchone()
        if not guest:
            cur.close()
            conn.close()
            return {"success": False, "error": "Guest not found"}

        guest_id, state = guest

        # אם מחכים למספר אורחים
        if state == 'waiting_for_guests_count':
            try:
                guests_count = int(text.strip())
                if guests_count <= 0:
                    raise ValueError("Must be positive")

                cur.execute("""
                    UPDATE guests
                    SET guests_count = %s,
                        conversation_state = 'done',
                        updated_at = NOW()
                    WHERE id = %s
                """, (guests_count, guest_id))

                conn.commit()
                cur.close()
                conn.close()

                send_follow_up_message(
                    phone,
                    f"תודה רבה! רשמנו {guests_count} אורחים 🎊\n\nמחכים לראותכם באירוע! 💙"
                )

                return {"success": True, "guests_count": guests_count}

            except ValueError:
                cur.close()
                conn.close()
                send_follow_up_message(
                    phone,
                    "אנא הזינו מספר תקין של אורחים (למשל: 2)"
                )
                return {"success": False, "error": "Invalid number"}

        cur.close()
        conn.close()
        return {"success": True, "message": "Text received but no action needed"}

    except Exception as e:
        print(f"Error handling text message: {e}")
        return {"success": False, "error": str(e)}
