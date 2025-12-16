"""
API endpoints לשליחת הזמנות דרך WhatsApp/SMS
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import psycopg2
from db import get_db_connection
from whatsapp_service import send_invitation_whatsapp, send_bulk_invitations, handle_rsvp_response, handle_text_message

router = APIRouter()


class SendInvitationRequest(BaseModel):
    event_id: int
    guest_ids: List[int]
    send_method: str = "whatsapp"  # whatsapp או sms
    scheduled_time: Optional[str] = None  # אופציונלי - לתזמון


class ScheduleInvitationsRequest(BaseModel):
    event_id: int
    send_method: str = "whatsapp"
    scheduled_date: str  # תאריך
    scheduled_time: str  # שעה


class RSVPWebhookRequest(BaseModel):
    guest_id: int
    response: str  # "confirmed" או "declined"


@router.post("/api/invitations/send")
async def send_invitations(request: SendInvitationRequest):
    """
    שליחת הזמנות לאורחים נבחרים
    """
    print(f"\n🚀 === SEND INVITATIONS REQUEST ===")
    print(f"📋 Event ID: {request.event_id}")
    print(f"👥 Guest IDs: {request.guest_ids}")
    print(f"📱 Send Method: {request.send_method}")
    print(f"===================================\n")

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # קבלת פרטי האירוע
        cur.execute("""
            SELECT id, event_type, event_title, event_name, event_date,
                   event_time, event_location, location, additional_info
            FROM events
            WHERE id = %s
        """, (request.event_id,))

        event = cur.fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        event_data = {
            "id": event[0],
            "event_type": event[1],
            "event_title": event[2],
            "event_name": event[3],
            "event_date": event[4].strftime("%d/%m/%Y") if event[4] else "",
            "event_time": event[5].strftime("%H:%M") if event[5] else "",
            "event_location": event[6] or event[7] or "",
            "additional_info": event[8] or ""
        }

        # קבלת פרטי האורחים
        placeholders = ','.join(['%s'] * len(request.guest_ids))
        cur.execute(f"""
            SELECT id, full_name, phone, whatsapp_number, email
            FROM guests
            WHERE id IN ({placeholders}) AND event_id = %s
        """, (*request.guest_ids, request.event_id))

        guests = cur.fetchall()

        if not guests:
            raise HTTPException(status_code=404, detail="No guests found")

        # המרה לרשימת דיקשנרים
        guests_list = []
        for g in guests:
            guests_list.append({
                "id": g[0],
                "full_name": g[1],
                "phone": g[2],
                "whatsapp_number": g[3] or g[2],
                "email": g[4]
            })

        # שליחה מיידית או תזמון?
        if request.scheduled_time:
            # תזמון לשליחה עתידית
            scheduled_dt = datetime.fromisoformat(request.scheduled_time)

            for guest in guests_list:
                # הכנת הודעה
                message = create_invitation_message(event_data, guest)

                # שמירה בטבלת scheduled_messages
                cur.execute("""
                    INSERT INTO scheduled_messages
                    (event_id, guest_id, message_type, recipient_number, message_content, scheduled_time, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                """, (
                    request.event_id,
                    guest["id"],
                    request.send_method,
                    guest["whatsapp_number"],
                    message,
                    scheduled_dt
                ))

            conn.commit()
            cur.close()
            conn.close()

            return {
                "success": True,
                "message": f"Invitations scheduled for {len(guests_list)} guests",
                "scheduled_for": request.scheduled_time
            }

        else:
            # שליחה מיידית
            if request.send_method == "whatsapp":
                results = send_bulk_invitations(request.event_id, guests_list, event_data)

                # עדכון סטטוס האורחים
                for guest in guests_list:
                    cur.execute("""
                        UPDATE guests
                        SET invitation_sent_at = NOW(),
                            invitation_status = 'sent'
                        WHERE id = %s
                    """, (guest["id"],))

                conn.commit()
                cur.close()
                conn.close()

                return {
                    "success": True,
                    "results": results
                }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending invitations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.post("/api/invitations/schedule")
async def schedule_all_invitations(request: ScheduleInvitationsRequest):
    """
    תזמון שליחת הזמנות לכל האורחים באירוע
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # שילוב תאריך ושעה
        scheduled_datetime = f"{request.scheduled_date} {request.scheduled_time}"
        scheduled_dt = datetime.strptime(scheduled_datetime, "%Y-%m-%d %H:%M")

        # עדכון האירוע
        cur.execute("""
            UPDATE events
            SET send_method = %s,
                scheduled_send_date = %s
            WHERE id = %s
        """, (request.send_method, scheduled_dt, request.event_id))

        # קבלת כל האורחים
        cur.execute("""
            SELECT id, full_name, phone, whatsapp_number
            FROM guests
            WHERE event_id = %s
        """, (request.event_id,))

        guests = cur.fetchall()

        # קבלת פרטי האירוע
        cur.execute("""
            SELECT event_type, event_title, event_date, event_time, event_location, additional_info
            FROM events
            WHERE id = %s
        """, (request.event_id,))

        event = cur.fetchone()
        event_data = {
            "id": request.event_id,
            "event_type": event[0],
            "event_title": event[1],
            "event_date": event[2].strftime("%d/%m/%Y") if event[2] else "",
            "event_time": event[3].strftime("%H:%M") if event[3] else "",
            "event_location": event[4] or "",
            "additional_info": event[5] or ""
        }

        # יצירת הודעות מתוזמנות לכל אורח
        for guest in guests:
            guest_data = {
                "id": guest[0],
                "full_name": guest[1],
                "phone": guest[2]
            }

            message = create_invitation_message(event_data, guest_data)
            phone_number = guest[3] or guest[2]

            cur.execute("""
                INSERT INTO scheduled_messages
                (event_id, guest_id, message_type, recipient_number, message_content, scheduled_time, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            """, (
                request.event_id,
                guest[0],
                request.send_method,
                phone_number,
                message,
                scheduled_dt
            ))

        conn.commit()
        cur.close()
        conn.close()

        return {
            "success": True,
            "message": f"Scheduled invitations for {len(guests)} guests",
            "scheduled_for": scheduled_datetime,
            "total_guests": len(guests)
        }

    except Exception as e:
        print(f"Error scheduling invitations: {e}")
        if conn:
            conn.rollback()
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/invitations/webhook/gupshup")
async def gupshup_webhook_test():
    """
    Endpoint לבדיקת חיבור של Gupshup
    """
    return {"success": True, "message": "Webhook is active"}


@router.post("/api/invitations/webhook/gupshup")
async def gupshup_webhook(data: dict = None):
    """
    Webhook לקבלת תשובות מ-Gupshup WhatsApp API
    תומך ב-Quick Reply buttons ובהודעות טקסט
    """
    try:
        # אם data ריק, מדובר בבדיקת חיבור מגאפשאפ
        if not data:
            print("🔔 Gupshup connection test received")
            return {"success": True, "message": "Webhook is active"}

        print(f"🔔 Received webhook from Gupshup: {data}")

        # Gupshup webhook structure:
        # {
        #   "type": "message",
        #   "payload": {
        #     "type": "quick_reply" | "text",
        #     "payload": { "postbackText": "..." } | { "text": "..." },
        #     "sender": { "phone": "972..." }
        #   }
        # }

        if data.get("type") == "message":
            payload = data.get("payload", {})
            message_type = payload.get("type")

            # קבלת מספר טלפון השולח
            sender = payload.get("sender", {})
            phone = sender.get("phone", "")

            # טיפול בלחיצה על כפתור Quick Reply
            if message_type == "quick_reply":
                button_payload = payload.get("payload", {})
                postback_text = button_payload.get("postbackText", "")

                print(f"📱 Quick Reply button clicked: {postback_text}")

                # מיפוי הכפתורים לסטטוסים
                # הכפתורים: "מאשר הגעה", "לא אגיע", "לא יודע כרגע"
                status_mapping = {
                    "מאשר הגעה": "confirmed",
                    "לא אגיע": "declined",
                    "לא יודע כרגע": "maybe"
                }

                response = status_mapping.get(postback_text)

                if response and phone:
                    # מציאת האורח לפי מספר טלפון
                    conn = get_db_connection()
                    cur = conn.cursor()

                    try:
                        cur.execute("""
                            SELECT id FROM guests
                            WHERE phone = %s OR whatsapp_number = %s
                            ORDER BY updated_at DESC
                            LIMIT 1
                        """, (phone, phone))

                        guest = cur.fetchone()

                        if guest:
                            guest_id = guest[0]

                            # קריאה לפונקציה שמטפלת ב-RSVP ושולחת הודעת המשך
                            result = handle_rsvp_response(guest_id, response, phone)

                            cur.close()
                            conn.close()

                            if result.get("success"):
                                return {
                                    "success": True,
                                    "message": "RSVP processed successfully",
                                    "guest_id": guest_id,
                                    "status": response
                                }
                        else:
                            cur.close()
                            conn.close()
                            print(f"❌ Guest not found for phone: {phone}")

                    except Exception as e:
                        print(f"❌ Error finding guest: {e}")
                        if conn:
                            conn.close()

            # טיפול בהודעת טקסט (למשל מספר אורחים)
            elif message_type == "text":
                text_payload = payload.get("payload", {})
                text_content = text_payload.get("text", "").strip()

                print(f"📝 Text message received: {text_content} from {phone}")

                if phone and text_content:
                    # קריאה לפונקציה שמטפלת בהודעת טקסט
                    result = handle_text_message(phone, text_content)

                    if result.get("success"):
                        return {
                            "success": True,
                            "message": "Text message processed",
                            "guests_count": result.get("guests_count")
                        }

        return {"success": True, "message": "Webhook received"}

    except Exception as e:
        print(f"❌ Error in webhook: {e}")
        import traceback
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}


@router.post("/api/invitations/rsvp")
async def handle_rsvp(request: RSVPWebhookRequest):
    """
    טיפול בתגובת RSVP מהאורח (webhook)
    """
    try:
        result = handle_rsvp_response(request.guest_id, request.response)

        if result.get("success"):
            return {
                "success": True,
                "message": "RSVP updated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))

    except Exception as e:
        print(f"Error handling RSVP: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/invitations/status/{event_id}")
async def get_invitation_status(event_id: int):
    """
    קבלת סטטוס שליחת הזמנות לאירוע
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # סטטיסטיקות אורחים
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN invitation_sent_at IS NOT NULL THEN 1 END) as sent,
                COUNT(CASE WHEN attendance_status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN attendance_status = 'declined' THEN 1 END) as declined,
                COUNT(CASE WHEN attendance_status = 'pending' THEN 1 END) as pending
            FROM guests
            WHERE event_id = %s
        """, (event_id,))

        stats = cur.fetchone()

        # הודעות מתוזמנות
        cur.execute("""
            SELECT COUNT(*) FROM scheduled_messages
            WHERE event_id = %s AND status = 'pending'
        """, (event_id,))

        scheduled_count = cur.fetchone()[0]

        cur.close()
        conn.close()

        return {
            "total_guests": stats[0],
            "invitations_sent": stats[1],
            "confirmed": stats[2],
            "declined": stats[3],
            "pending": stats[4],
            "scheduled_messages": scheduled_count
        }

    except Exception as e:
        print(f"Error getting invitation status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


def create_invitation_message(event_data: dict, guest_data: dict) -> str:
    """
    יצירת תוכן הודעת הזמנה
    """
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

    guest_name = guest_data.get('full_name', 'אורח יקר')

    message = f"""🎉 הנכם מוזמנים! 🎉

שלום {guest_name},

אנו שמחים להזמינכם ל{event_type_hebrew}!

📅 תאריך: {event_data.get('event_date')}
🕐 שעה: {event_data.get('event_time')}
📍 מקום: {event_data.get('event_location')}

{event_data.get('additional_info', '')}

נשמח לאישור הגעתכם 💙

נתראה!
"""
    return message
