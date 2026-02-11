"""
SMS API Endpoints for sending SMS messages via 019SMS
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import psycopg2
import hashlib
from db import get_db_connection
from sms_service import sms_service

router = APIRouter(prefix="/api/sms", tags=["SMS"])


@router.post("/send-invitation/{guest_id}")
async def send_sms_invitation(guest_id: int):
    """Send SMS invitation to a specific guest"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get guest and event details
        cur.execute("""
            SELECT g.name, g.phone, e.event_name, e.event_date, e.event_time, e.event_location
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE g.id = %s
        """, (guest_id,))

        guest_data = cur.fetchone()
        if not guest_data:
            raise HTTPException(status_code=404, detail="Guest not found")

        guest_name, phone, event_name, event_date, event_time, event_location = guest_data

        if not phone:
            raise HTTPException(status_code=400, detail="Guest has no phone number")

        # Format date and time
        if isinstance(event_date, datetime):
            formatted_date = event_date.strftime('%d/%m/%Y')
        elif event_date:
            formatted_date = str(event_date)
        else:
            formatted_date = "יודיע בהמשך"

        if isinstance(event_time, datetime):
            formatted_time = event_time.strftime('%H:%M')
        elif event_time:
            formatted_time = str(event_time)
        else:
            formatted_time = '18:00'

        # Generate RSVP link
        # Create unique token for this guest
        token = hashlib.sha256(f"{guest_id}-{phone}-{event_name}".encode()).hexdigest()[:16]
        rsvp_link = f"https://savedayevents.com/rsvp/{guest_id}?token={token}"

        # Send SMS
        print(f"📱 Sending SMS to: {phone}")
        print(f"👤 Guest: {guest_name}")
        print(f"🎉 Event: {event_name}")
        print(f"🔗 RSVP Link: {rsvp_link}")

        result = sms_service.send_event_invitation_sms(
            destination=phone,
            event_name=event_name,
            rsvp_link=rsvp_link
        )

        print(f"✉️ 019SMS Response: {result}")

        cur.close()
        conn.close()

        if not result['success']:
            error_detail = result.get('error', 'Failed to send SMS')
            if result.get('response_text'):
                error_detail += f" - Response: {result['response_text']}"
            print(f"❌ Send failed: {error_detail}")
            raise HTTPException(status_code=400, detail=error_detail)

        return {
            'success': True,
            'guest_name': guest_name,
            'phone': phone,
            'message': 'SMS invitation sent successfully',
            'message_data': result.get('data')
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-bulk-invitations/{event_id}")
async def send_bulk_sms_invitations(event_id: int):
    """Send SMS invitations to all guests of an event using bulk API"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get all guests with phone numbers for this event
        cur.execute("""
            SELECT g.id, g.name, g.phone, e.event_name, e.event_date, e.event_time, e.event_location
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE e.id = %s AND g.phone IS NOT NULL AND g.phone != ''
        """, (event_id,))

        guests = cur.fetchall()
        cur.close()
        conn.close()

        if not guests:
            raise HTTPException(status_code=404, detail="No guests with phone numbers found for this event")

        # Prepare all messages for bulk sending
        bulk_messages = []
        guest_info = []  # Track guest info for response

        for guest_id, guest_name, phone, event_name, event_date, event_time, event_location in guests:
            # Format date and time
            if isinstance(event_date, datetime):
                formatted_date = event_date.strftime('%d/%m/%Y')
            elif event_date:
                formatted_date = str(event_date)
            else:
                formatted_date = "יודיע בהמשך"

            if isinstance(event_time, datetime):
                formatted_time = event_time.strftime('%H:%M')
            elif event_time:
                formatted_time = str(event_time)
            else:
                formatted_time = '18:00'

            # Generate RSVP link for this guest
            token = hashlib.sha256(f"{guest_id}-{phone}-{event_name}".encode()).hexdigest()[:16]
            rsvp_link = f"https://savedayevents.com/rsvp/{guest_id}?token={token}"

            # Build message text with RSVP link
            message_text = f"הנכם מוזמנים ל{event_name}, נשמח שתאשרו הגעתכם בלינק הבא: {rsvp_link}"

            bulk_messages.append({
                "destination": phone,
                "message": message_text
            })

            guest_info.append({
                'guest_id': guest_id,
                'guest_name': guest_name,
                'phone': phone
            })

        print(f"📱 Sending bulk SMS to {len(bulk_messages)} guests")

        # Send all messages in a single bulk API call
        result = sms_service.send_bulk_sms(messages=bulk_messages)

        if not result['success']:
            error_detail = result.get('error', 'Failed to send bulk SMS')
            print(f"❌ Bulk send failed: {error_detail}")
            raise HTTPException(status_code=400, detail=error_detail)

        print(f"✅ Bulk SMS sent successfully: {result.get('data')}")

        return {
            'total': len(bulk_messages),
            'successful': len(bulk_messages),  # All sent in single API call
            'failed': 0,
            'guests': guest_info,
            'api_response': result.get('data')
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending bulk SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/health")
async def sms_health_check():
    """Check if SMS service is configured correctly"""
    is_configured = bool(sms_service.username and sms_service.api_token)

    return {
        'status': 'configured' if is_configured else 'not_configured',
        'username': sms_service.username if is_configured else None,
        'template_name': sms_service.template_name,
        'api_url': sms_service.api_url
    }
