"""
SMS Webhook Handler for receiving replies from 019SMS
Handles incoming SMS responses and updates guest status accordingly
"""
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import psycopg2
from db import get_db_connection
from sms_service import sms_service

router = APIRouter(prefix="/api/sms-webhook", tags=["SMS Webhook"])


class SMSReplyWebhook(BaseModel):
    """019SMS webhook payload for incoming SMS replies"""
    from_number: str  # Phone number of sender
    message: str  # Reply message content
    timestamp: Optional[str] = None
    message_id: Optional[str] = None


# State machine for guest responses
guest_response_state = {}  # {phone_number: {"state": "waiting_count", "guest_id": 123}}


def normalize_phone(phone: str) -> str:
    """Normalize phone number to match database format"""
    digits_only = ''.join(filter(str.isdigit, phone))

    # Convert to 972xxx format for consistency
    if digits_only.startswith('0'):
        return '972' + digits_only[1:]
    elif digits_only.startswith('972'):
        return digits_only
    else:
        return '972' + digits_only


def find_guest_by_phone(phone: str):
    """Find guest in database by phone number"""
    normalized_phone = normalize_phone(phone)

    conn = get_db_connection()
    cur = conn.cursor()

    # Try different phone formats
    formats_to_try = [
        normalized_phone,  # 972xxx
        '0' + normalized_phone[3:],  # 05xxx
        normalized_phone[3:],  # 5xxx
        '+' + normalized_phone  # +972xxx
    ]

    for phone_format in formats_to_try:
        cur.execute("""
            SELECT id, name, event_id, status, attending_count
            FROM guests
            WHERE phone = %s OR phone = %s
            LIMIT 1
        """, (phone_format, phone_format.replace('-', '')))

        result = cur.fetchone()
        if result:
            cur.close()
            conn.close()
            return {
                'id': result[0],
                'name': result[1],
                'event_id': result[2],
                'status': result[3],
                'attending_count': result[4]
            }

    cur.close()
    conn.close()
    return None


def update_guest_status(guest_id: int, status: str, attending_count: Optional[int] = None):
    """Update guest status and attending count in database"""
    conn = get_db_connection()
    cur = conn.cursor()

    if attending_count is not None:
        cur.execute("""
            UPDATE guests
            SET status = %s, attending_count = %s, updated_at = NOW()
            WHERE id = %s
        """, (status, attending_count, guest_id))
    else:
        cur.execute("""
            UPDATE guests
            SET status = %s, updated_at = NOW()
            WHERE id = %s
        """, (status, guest_id))

    conn.commit()
    cur.close()
    conn.close()


async def send_reply_sms(phone: str, message: str):
    """Send automated reply SMS to guest"""
    result = sms_service.send_simple_sms(
        destination=phone,
        message=message
    )
    print(f"📤 Sent reply to {phone}: {message}")
    return result


@router.api_route("/incoming", methods=["GET", "POST"])
async def handle_incoming_sms(request: Request, background_tasks: BackgroundTasks):
    """
    Handle incoming SMS from 019SMS webhook

    019SMS sends via GET with query parameters:
    - msisdn: The sender's phone number
    - msg: The message content

    Example: /incoming?msisdn=0547804286&msg=1
    """
    try:
        # Check if GET or POST request
        if request.method == "GET":
            # 019SMS uses GET with query parameters
            params = request.query_params
            from_number = params.get('msisdn') or params.get('from') or params.get('phone')
            message = params.get('msg') or params.get('message') or params.get('text')

            print(f"📥 Received SMS webhook (GET): msisdn={from_number}, msg={message}")
        else:
            # Fallback to POST with JSON (for testing)
            payload = await request.json()
            from_number = payload.get('msisdn') or payload.get('from') or payload.get('from_number') or payload.get('phone')
            message = payload.get('msg') or payload.get('message') or payload.get('text') or payload.get('content')

            print(f"📥 Received SMS webhook (POST): {payload}")

        if not from_number or message is None:
            print(f"❌ Invalid webhook data: from={from_number}, msg={message}")
            return {"status": "ok", "message": "Missing required parameters"}

        message = message.strip()

        # Find guest by phone number
        guest = find_guest_by_phone(from_number)

        if not guest:
            print(f"⚠️ Guest not found for phone: {from_number}")
            return {"status": "ok", "message": "Guest not found"}

        guest_name = guest['name']
        guest_id = guest['id']

        print(f"👤 Found guest: {guest_name} (ID: {guest_id})")

        # Check if guest is in "waiting for count" state
        if from_number in guest_response_state:
            state = guest_response_state[from_number]

            if state['state'] == 'waiting_count':
                # Guest is responding with number of attendees
                try:
                    attending_count = int(message)

                    if attending_count <= 0:
                        # Invalid count
                        reply_message = "נא להזין מספר חיובי של מגיעים"
                        background_tasks.add_task(send_reply_sms, from_number, reply_message)
                        return {"status": "ok", "message": "Invalid count"}

                    # Update database with attending count
                    update_guest_status(guest_id, 'confirmed', attending_count)

                    # Remove from state machine
                    del guest_response_state[from_number]

                    # Send confirmation
                    reply_message = f"תודה רבה! רשמנו {attending_count} מגיעים. נשמח לראותכם!"
                    background_tasks.add_task(send_reply_sms, from_number, reply_message)

                    print(f"✅ Updated guest {guest_name}: confirmed, {attending_count} attendees")

                    return {
                        "status": "ok",
                        "message": f"Guest confirmed with {attending_count} attendees",
                        "guest_id": guest_id,
                        "attending_count": attending_count
                    }

                except ValueError:
                    # Not a valid number
                    reply_message = "נא להזין מספר בלבד (לדוגמא: 2)"
                    background_tasks.add_task(send_reply_sms, from_number, reply_message)
                    return {"status": "ok", "message": "Invalid number format"}

        # Initial response: 1 (coming) or 0 (not coming)
        if message == '1':
            # Guest is coming - ask for count
            guest_response_state[from_number] = {
                'state': 'waiting_count',
                'guest_id': guest_id,
                'timestamp': datetime.now()
            }

            # Update status to "tentative" until we get the count
            update_guest_status(guest_id, 'tentative')

            # Ask for number of attendees
            reply_message = "מעולה! כמה תגיעו? (רשמו את מספר המגיעים, לדוגמא: 2)"
            background_tasks.add_task(send_reply_sms, from_number, reply_message)

            print(f"✅ Guest {guest_name} responded YES, waiting for count")

            return {
                "status": "ok",
                "message": "Guest confirmed attendance, waiting for count",
                "guest_id": guest_id
            }

        elif message == '0':
            # Guest is not coming
            update_guest_status(guest_id, 'declined', 0)

            # Remove from state machine if exists
            if from_number in guest_response_state:
                del guest_response_state[from_number]

            # Send thank you message
            reply_message = "תודה על העדכון! נשמח לראותך בהזדמנות אחרת!"
            background_tasks.add_task(send_reply_sms, from_number, reply_message)

            print(f"✅ Guest {guest_name} declined invitation")

            return {
                "status": "ok",
                "message": "Guest declined invitation",
                "guest_id": guest_id
            }

        else:
            # Unknown response
            print(f"⚠️ Unknown response from {guest_name}: {message}")

            # Send help message
            reply_message = "נא להגיב 1 אם אתם מגיעים, או 0 אם לא"
            background_tasks.add_task(send_reply_sms, from_number, reply_message)

            return {
                "status": "ok",
                "message": "Unknown response format"
            }

    except Exception as e:
        print(f"❌ Error processing SMS webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "ok", "message": "Error processed"}


@router.get("/health")
async def webhook_health():
    """Health check for SMS webhook"""
    return {
        "status": "ok",
        "webhook_url": "/api/sms-webhook/incoming",
        "active_states": len(guest_response_state)
    }


@router.post("/test")
async def test_webhook(from_number: str, message: str):
    """Test endpoint for webhook (development only)"""
    test_payload = {
        "from": from_number,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }

    class FakeRequest:
        async def json(self):
            return test_payload

    background_tasks = BackgroundTasks()
    return await handle_incoming_sms(FakeRequest(), background_tasks)
