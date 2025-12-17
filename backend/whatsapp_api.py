"""
WhatsApp Interactive Messages API Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import psycopg2
from db import get_db_connection
from whatsapp_interactive import whatsapp_service

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


# Pydantic Models
class ListSection(BaseModel):
    title: str
    rows: List[Dict[str, str]]


class SendListMessageRequest(BaseModel):
    destination: str
    header: str
    body: str
    footer: str
    button_text: str
    sections: List[Dict[str, Any]]


class SendReplyButtonsRequest(BaseModel):
    destination: str
    body: str
    buttons: List[Dict[str, str]]
    header: Optional[str] = None
    footer: Optional[str] = None


class SendLocationRequestRequest(BaseModel):
    destination: str
    body: str


class SendAddressRequestRequest(BaseModel):
    destination: str
    body: str
    country: str = "IL"
    header: Optional[str] = None
    footer: Optional[str] = None
    pre_filled_values: Optional[Dict] = None
    saved_addresses: Optional[List[Dict]] = None


class SendEventRSVPRequest(BaseModel):
    guest_id: int
    event_id: int


class WebhookPayload(BaseModel):
    """Webhook payload from Gupshup"""
    app: str
    timestamp: int
    version: int
    type: str
    payload: Dict[str, Any]


@router.post("/send-list")
async def send_list_message(request: SendListMessageRequest):
    """Send a WhatsApp list message"""
    try:
        result = whatsapp_service.send_list_message(
            destination=request.destination,
            header=request.header,
            body=request.body,
            footer=request.footer,
            button_text=request.button_text,
            sections=request.sections
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send message'))

        return result['data']
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-buttons")
async def send_reply_buttons(request: SendReplyButtonsRequest):
    """Send a WhatsApp message with reply buttons"""
    try:
        result = whatsapp_service.send_reply_buttons(
            destination=request.destination,
            body=request.body,
            buttons=request.buttons,
            header=request.header,
            footer=request.footer
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send message'))

        return result['data']
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-location-request")
async def send_location_request(request: SendLocationRequestRequest):
    """Send a WhatsApp location request"""
    try:
        result = whatsapp_service.send_location_request(
            destination=request.destination,
            body=request.body
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send message'))

        return result['data']
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-address-request")
async def send_address_request(request: SendAddressRequestRequest):
    """Send a WhatsApp address request"""
    try:
        result = whatsapp_service.send_address_request(
            destination=request.destination,
            body=request.body,
            country=request.country,
            header=request.header,
            footer=request.footer,
            pre_filled_values=request.pre_filled_values,
            saved_addresses=request.saved_addresses
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send message'))

        return result['data']
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-event-rsvp")
async def send_event_rsvp(request: SendEventRSVPRequest):
    """Send RSVP buttons to a guest for an event"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get guest details
        cur.execute("""
            SELECT g.name, g.phone, e.event_name, e.event_date, e.event_location
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE g.id = %s AND e.id = %s
        """, (request.guest_id, request.event_id))

        guest_data = cur.fetchone()
        if not guest_data:
            raise HTTPException(status_code=404, detail="Guest or event not found")

        guest_name, phone, event_name, event_date, event_location = guest_data

        if not phone:
            raise HTTPException(status_code=400, detail="Guest has no phone number")

        # Format phone number (ensure it has country code)
        if not phone.startswith('+'):
            phone = f'+{phone}'

        # Send RSVP message
        result = whatsapp_service.send_event_rsvp_buttons(
            destination=phone,
            guest_name=guest_name,
            event_name=event_name,
            event_date=event_date.strftime('%d/%m/%Y') if isinstance(event_date, datetime) else str(event_date),
            event_location=event_location or "יודיע בהמשך"
        )

        cur.close()
        conn.close()

        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to send message'))

        return {
            'success': True,
            'guest_name': guest_name,
            'phone': phone,
            'message_data': result['data']
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-bulk-rsvp/{event_id}")
async def send_bulk_rsvp(event_id: int):
    """Send RSVP buttons to all guests of an event"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get all guests with phone numbers for this event
        cur.execute("""
            SELECT g.id, g.name, g.phone, e.event_name, e.event_date, e.event_location
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
        for guest_id, guest_name, phone, event_name, event_date, event_location in guests:
            # Format phone number
            if not phone.startswith('+'):
                phone = f'+{phone}'

            # Send RSVP message
            result = whatsapp_service.send_event_rsvp_buttons(
                destination=phone,
                guest_name=guest_name,
                event_name=event_name,
                event_date=event_date.strftime('%d/%m/%Y') if isinstance(event_date, datetime) else str(event_date),
                event_location=event_location or "יודיע בהמשך"
            )

            results.append({
                'guest_id': guest_id,
                'guest_name': guest_name,
                'phone': phone,
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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/gupshup")
async def gupshup_webhook(payload: Dict = Body(...)):
    """
    Webhook endpoint to receive responses from Gupshup
    Handles RSVP responses, location shares, address submissions, etc.
    """
    try:
        print(f"📨 Received webhook: {payload}")

        message_type = payload.get('type')
        if message_type != 'message':
            return {"status": "ignored", "reason": "Not a message event"}

        message_payload = payload.get('payload', {})
        msg_type = message_payload.get('type')
        sender_phone = message_payload.get('sender', {}).get('phone')

        # Handle button reply (RSVP response)
        if msg_type == 'button_reply':
            button_id = message_payload.get('payload', {}).get('id')

            # Update guest attendance status based on button clicked
            conn = get_db_connection()
            cur = conn.cursor()

            status_map = {
                'rsvp_yes': 'confirmed',
                'rsvp_maybe': 'maybe',
                'rsvp_no': 'declined'
            }

            new_status = status_map.get(button_id)
            if new_status and sender_phone:
                # Clean phone number for matching
                clean_phone = sender_phone.replace('+', '')

                cur.execute("""
                    UPDATE guests
                    SET attendance_status = %s, updated_at = NOW()
                    WHERE phone LIKE %s OR phone LIKE %s
                """, (new_status, f'%{clean_phone}', f'+{clean_phone}'))

                conn.commit()
                print(f"✅ Updated guest status: {sender_phone} -> {new_status}")

            cur.close()
            conn.close()

        # Handle location reply
        elif msg_type == 'location':
            location_data = message_payload.get('payload', {})
            print(f"📍 Received location: {location_data}")
            # Store location if needed

        # Handle address reply (nfm_reply type)
        elif msg_type == 'nfm_reply':
            address_data = message_payload.get('payload', {})
            print(f"🏠 Received address: {address_data}")
            # Store address if needed

        return {"status": "success", "message": "Webhook processed"}

    except Exception as e:
        print(f"❌ Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/webhook/gupshup")
async def gupshup_webhook_verify():
    """GET endpoint for webhook verification"""
    return {"status": "ok", "message": "Webhook endpoint is active"}
