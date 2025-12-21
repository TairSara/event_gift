"""
SMS API Endpoints for sending SMS messages via 019SMS
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import psycopg2
from db import get_db_connection
from sms_service import sms_service

router = APIRouter(prefix="/api/sms", tags=["SMS"])


class SendSMSRequest(BaseModel):
    destination: str
    greeting: str
    intro_text: str
    event_description: str
    event_date: str
    event_time: str
    event_location: str


def format_israeli_phone(phone: str) -> str:
    """
    Format Israeli phone number to international format for 019SMS.

    Converts Israeli numbers like:
    - 0501234567 -> 972501234567
    - 050-123-4567 -> 972501234567
    - +972501234567 -> 972501234567

    Args:
        phone: Raw phone number from database

    Returns:
        Formatted phone number without + prefix (e.g., 972501234567)
    """
    # Remove all non-digit characters
    digits_only = ''.join(filter(str.isdigit, phone))

    # If it starts with 972, it's already in international format
    if digits_only.startswith('972'):
        return digits_only

    # If it starts with 0, it's an Israeli local number
    if digits_only.startswith('0'):
        # Remove leading 0 and add 972 country code
        return '972' + digits_only[1:]

    # If no leading 0 or 972, assume it's missing the country code
    # and treat it as a local number (add 972)
    return '972' + digits_only


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

        # Format phone number for Israeli numbers (050... -> 97250...)
        formatted_phone = format_israeli_phone(phone)

        # Format date and time
        if isinstance(event_date, datetime):
            formatted_date = event_date.strftime('%d/%m/%Y')
        else:
            formatted_date = str(event_date)

        if isinstance(event_time, datetime):
            formatted_time = event_time.strftime('%H:%M')
        else:
            formatted_time = str(event_time) if event_time else '18:00'

        # Prepare final location (fallback to default if empty)
        final_location = event_location or "יודיע בהמשך"

        # Prepare SMS content based on template structure
        greeting = f"שלום {guest_name},"
        intro_text = "אנו שמחים להזמינכם"
        event_description = event_name

        # Send SMS
        print(f"📱 Sending SMS to: {formatted_phone}")
        print(f"👤 Guest: {guest_name}")
        print(f"🎉 Event: {event_name}")
        print(f"📅 Date: {formatted_date}, Time: {formatted_time}")
        print(f"📍 Location: {final_location}")

        result = sms_service.send_event_invitation_sms(
            destination=formatted_phone,
            greeting=greeting,
            intro_text=intro_text,
            event_description=event_description,
            event_date=formatted_date,
            event_time=formatted_time,
            event_location=final_location
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
            'phone': formatted_phone,
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
    """Send SMS invitations to all guests of an event"""
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

        results = []
        for guest_id, guest_name, phone, event_name, event_date, event_time, event_location in guests:
            # Format phone number for Israeli numbers (050... -> 97250...)
            formatted_phone = format_israeli_phone(phone)

            # Format date and time
            if isinstance(event_date, datetime):
                formatted_date = event_date.strftime('%d/%m/%Y')
            else:
                formatted_date = str(event_date)

            if isinstance(event_time, datetime):
                formatted_time = event_time.strftime('%H:%M')
            else:
                formatted_time = str(event_time) if event_time else '18:00'

            # Prepare final location
            final_location = event_location or "יודיע בהמשך"

            # Prepare SMS content
            greeting = f"שלום {guest_name},"
            intro_text = "אנו שמחים להזמינכם"
            event_description = event_name

            # Send SMS
            result = sms_service.send_event_invitation_sms(
                destination=formatted_phone,
                greeting=greeting,
                intro_text=intro_text,
                event_description=event_description,
                event_date=formatted_date,
                event_time=formatted_time,
                event_location=final_location
            )

            results.append({
                'guest_id': guest_id,
                'guest_name': guest_name,
                'phone': formatted_phone,
                'success': result['success'],
                'data': result.get('data') if result['success'] else result.get('error')
            })

        successful = sum(1 for r in results if r['success'])
        failed = len(results) - successful

        return {
            'total': len(results),
            'successful': successful,
            'failed': failed,
            'results': results
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending bulk SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-custom")
async def send_custom_sms(request: SendSMSRequest):
    """Send custom SMS with specific parameters"""
    try:
        formatted_phone = format_israeli_phone(request.destination)

        result = sms_service.send_event_invitation_sms(
            destination=formatted_phone,
            greeting=request.greeting,
            intro_text=request.intro_text,
            event_description=request.event_description,
            event_date=request.event_date,
            event_time=request.event_time,
            event_location=request.event_location
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send SMS'))

        return {
            'success': True,
            'phone': formatted_phone,
            'message': 'SMS sent successfully',
            'data': result.get('data')
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending custom SMS: {str(e)}")
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
