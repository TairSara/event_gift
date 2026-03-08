"""
WhatsApp Interactive Messages API Endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import psycopg2
import os
from db import get_db_connection
from whatsapp_interactive import whatsapp_service, DEFAULT_INVITATION_IMAGE

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


def optimize_cloudinary_url(url: str) -> str:
    """
    Add Cloudinary transformation params for WhatsApp delivery.
    Reduces file size without visible quality loss on mobile screens.
    Original image in DB is untouched.
    """
    if not url or 'cloudinary.com' not in url:
        return url
    # Insert transformation after /upload/
    return url.replace('/upload/', '/upload/q_auto:best,f_jpg,w_1200/', 1)


def format_israeli_phone(phone: str) -> str:
    """
    Format Israeli phone number to international format for Gupshup.

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


@router.post("/send-template-invitation/{guest_id}")
async def send_template_invitation(guest_id: int):
    """Send template invitation message to a guest with image"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get guest and event details, including invitation_data which may contain image URL
        cur.execute("""
            SELECT g.name, g.phone, e.event_name, e.event_date, e.event_time, e.event_location, e.invitation_data, e.id
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE g.id = %s
        """, (guest_id,))

        guest_data = cur.fetchone()
        if not guest_data:
            raise HTTPException(status_code=404, detail="Guest not found")

        guest_name, phone, event_name, event_date, event_time, event_location, invitation_data, event_id = guest_data

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

        # Extract image URL from invitation_data
        # Note: invitation_data contains template info, not a direct image URL
        # The invitation is generated dynamically in the frontend
        image_url = None

        if invitation_data and isinstance(invitation_data, dict):
            # Check if there's a generated/uploaded image URL
            image_url = (
                invitation_data.get('generated_image_url') or
                invitation_data.get('image_url') or
                invitation_data.get('imageUrl')
            )

            if image_url:
                print(f"🖼️ Found custom image in invitation_data: {image_url}")

        # Fallback to default if no image found
        if not image_url:
            image_url = DEFAULT_INVITATION_IMAGE
            print(f"⚠️ No custom image found, using default: {image_url}")
            print(f"💡 TIP: To use event-specific images, save 'generated_image_url' in invitation_data")

        # Optimize image URL for WhatsApp delivery
        image_url = optimize_cloudinary_url(image_url)
        print(f"🖼️ Optimized image URL: {image_url}")

        # Prepare final location (fallback to default if empty)
        final_location = event_location or "יודיע בהמשך"

        # Send template message
        print(f"📱 Sending WhatsApp to: {formatted_phone}")
        print(f"👤 Guest: {guest_name}")
        print(f"🎉 Event: {event_name}")
        print(f"📅 Date: {formatted_date}, Time: {formatted_time}")
        print(f"📍 Location: {final_location}")
        print(f"🖼️ Image URL: {image_url}")
        print(f"📊 Template will receive {6} parameters")

        result = whatsapp_service.send_event_invitation_template(
            destination=formatted_phone,
            guest_name=guest_name,
            event_name=event_name,
            event_date=formatted_date,
            event_time=formatted_time,
            event_location=final_location,
            image_url=image_url
        )

        print(f"✉️ Gupshup Response: {result}")

        if result['success']:
            # Save WhatsApp session: phone -> guest_id + event_id
            try:
                cur.execute("""
                    INSERT INTO whatsapp_sessions (phone, event_id, guest_id, updated_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (phone) DO UPDATE SET event_id = EXCLUDED.event_id, guest_id = EXCLUDED.guest_id, updated_at = NOW()
                """, (formatted_phone, event_id, guest_id))
                conn.commit()
                print(f"💾 Saved WhatsApp session: phone={formatted_phone} -> event_id={event_id}, guest_id={guest_id}")
            except Exception as se:
                print(f"⚠️ Failed to save WhatsApp session: {se}")

        cur.close()
        conn.close()

        if not result['success']:
            error_detail = result.get('error', 'Failed to send message')
            if result.get('response_text'):
                error_detail += f" - Response: {result['response_text']}"
            print(f"❌ Send failed: {error_detail}")
            raise HTTPException(status_code=400, detail=error_detail)

        return {
            'success': True,
            'guest_name': guest_name,
            'phone': formatted_phone,
            'message': 'Template invitation sent successfully',
            'message_data': result.get('data')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-template-reminder/{guest_id}")
async def send_template_reminder(guest_id: int):
    """Send reminder template message to a guest who hasn't RSVP'd"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get guest and event details, including invitation_data which may contain image URL
        cur.execute("""
            SELECT g.name, g.phone, e.event_name, e.event_date, e.event_time, e.event_location, e.invitation_data
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE g.id = %s
        """, (guest_id,))

        guest_data = cur.fetchone()
        if not guest_data:
            raise HTTPException(status_code=404, detail="Guest not found")

        guest_name, phone, event_name, event_date, event_time, event_location, invitation_data = guest_data

        if not phone:
            raise HTTPException(status_code=400, detail="Guest has no phone number")

        # Format phone number for Israeli numbers (050... -> 97250...)
        formatted_phone = format_israeli_phone(phone)

        # Extract image URL from invitation_data
        image_url = None
        if invitation_data and isinstance(invitation_data, dict):
            image_url = (
                invitation_data.get('generated_image_url') or
                invitation_data.get('image_url') or
                invitation_data.get('imageUrl')
            )
            if image_url:
                print(f"🖼️ Found custom image in invitation_data: {image_url}")

        # Fallback to default if no image found
        if not image_url:
            image_url = DEFAULT_INVITATION_IMAGE
            print(f"⚠️ No custom image found, using default: {image_url}")

        # Optimize image URL for WhatsApp delivery
        image_url = optimize_cloudinary_url(image_url)
        print(f"🖼️ Optimized image URL: {image_url}")

        # Send reminder template message
        print(f"📱 Sending WhatsApp reminder to: {formatted_phone}")
        print(f"👤 Guest: {guest_name}")
        print(f"🎉 Event: {event_name}")
        print(f"🖼️ Image URL: {image_url}")

        result = whatsapp_service.send_event_reminder_template(
            destination=formatted_phone,
            event_name=event_name,
            image_url=image_url
        )

        print(f"✉️ Gupshup Response: {result}")

        cur.close()
        conn.close()

        if not result['success']:
            error_detail = result.get('error', 'Failed to send reminder')
            if result.get('response_text'):
                error_detail += f" - Response: {result['response_text']}"
            print(f"❌ Send failed: {error_detail}")
            raise HTTPException(status_code=400, detail=error_detail)

        return {
            'success': True,
            'guest_name': guest_name,
            'phone': formatted_phone,
            'message': 'Reminder sent successfully',
            'message_data': result.get('data')
        }

    except HTTPException:
        raise
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

        # Format phone number for Israeli numbers (050... -> 97250...)
        formatted_phone = format_israeli_phone(phone)

        # Send RSVP message
        result = whatsapp_service.send_event_rsvp_buttons(
            destination=formatted_phone,
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
            'phone': formatted_phone,
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
            # Format phone number for Israeli numbers (050... -> 97250...)
            formatted_phone = format_israeli_phone(phone)

            # Send RSVP message
            result = whatsapp_service.send_event_rsvp_buttons(
                destination=formatted_phone,
                guest_name=guest_name,
                event_name=event_name,
                event_date=event_date.strftime('%d/%m/%Y') if isinstance(event_date, datetime) else str(event_date),
                event_location=event_location or "יודיע בהמשך"
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

        # Handle quick_reply (buttons from templates) OR button_reply (interactive buttons)
        if msg_type in ['button_reply', 'quick_reply']:
            # For quick_reply, button text is in payload.postbackText or payload.text
            # For button_reply, button ID is in payload.id
            if msg_type == 'quick_reply':
                button_text = message_payload.get('payload', {}).get('postbackText', '').strip()
                print(f"📩 Received quick_reply: '{button_text}' from {sender_phone}")

                # Map Hebrew button text to our internal button IDs
                # Includes buttons from both invitation and reminder templates
                button_mapping = {
                    'מאשר הגעה': 'rsvp_yes',
                    'לא יודע כרגע': 'rsvp_maybe',
                    'לא מגיע': 'rsvp_no',
                    'מגיע': 'rsvp_yes',
                }
                button_id = button_mapping.get(button_text, None)

                if not button_id:
                    print(f"⚠️ Unknown quick_reply button: '{button_text}'")
                    return {"status": "ignored", "reason": "Unknown button text"}
            else:
                button_id = message_payload.get('payload', {}).get('id')

            # Update guest attendance status based on button clicked
            conn = get_db_connection()
            cur = conn.cursor()

            # Handle initial RSVP response
            status_map = {
                'rsvp_yes': 'confirmed',
                'rsvp_maybe': 'maybe',
                'rsvp_no': 'declined'
            }

            new_status = status_map.get(button_id)
            if new_status and sender_phone:
                # Clean phone number for matching
                clean_phone = sender_phone.replace('+', '')

                # First: try to find guest via WhatsApp session (event-specific)
                cur.execute("""
                    SELECT ws.guest_id FROM whatsapp_sessions ws
                    WHERE ws.phone = %s OR ws.phone = %s OR ws.phone LIKE %s
                    LIMIT 1
                """, (clean_phone, f'+{clean_phone}', f'%{clean_phone[-9:]}'))
                session_row = cur.fetchone()

                if session_row:
                    row = session_row
                    print(f"✅ Found guest via WhatsApp session: guest_id={session_row[0]}")
                else:
                    # Fallback: most recently invited guest with this phone
                    cur.execute("""
                        SELECT id FROM guests
                        WHERE (phone LIKE %s OR phone LIKE %s OR phone LIKE %s)
                          AND invitation_sent IS NOT NULL
                        ORDER BY invitation_sent DESC
                        LIMIT 1
                    """, (f'%{clean_phone}', f'+{clean_phone}', f'%{clean_phone[-9:]}'))
                    row = cur.fetchone()

                if not row:
                    # Last resort fallback
                    cur.execute("""
                        SELECT id FROM guests
                        WHERE phone LIKE %s OR phone LIKE %s OR phone LIKE %s
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (f'%{clean_phone}', f'+{clean_phone}', f'%{clean_phone[-9:]}'))
                    row = cur.fetchone()

                if not row:
                    print(f"⚠️ No guest found for phone: {sender_phone}")
                    cur.close()
                    conn.close()
                    return {"status": "ignored", "reason": "Guest not found"}

                target_guest_id = row[0]
                print(f"🎯 Targeting guest_id={target_guest_id} for phone {sender_phone}")

                if new_status == 'confirmed':
                    # Don't update status yet - wait for guest count
                    text_message = """נהדר! 🎉 שמחים שתגיעו!

כמה אנשים בסך הכל יגיעו? (כולל אתכם)

אנא שלחו מספר בלבד, לדוגמה: 2"""

                    result = whatsapp_service.send_text_message(
                        destination=sender_phone,
                        text=text_message
                    )

                    if result['success']:
                        print(f"📩 Sent guest count question to: {sender_phone}")
                    else:
                        print(f"❌ Failed to send guest count question: {result.get('error')}")
                else:
                    # For 'maybe' or 'declined', update only the targeted guest
                    cur.execute("""
                        UPDATE guests
                        SET status = %s, attendance_status = %s, updated_at = NOW()
                        WHERE id = %s
                        RETURNING id, name, phone, status
                    """, (new_status, new_status, target_guest_id))

                    updated_guests = cur.fetchall()
                    conn.commit()

                    if updated_guests:
                        print(f"✅ Updated guest: {updated_guests[0]}")
                        if new_status == 'declined':
                            whatsapp_service.send_text_message(
                                destination=sender_phone,
                                text="תודה על עדכון! נשמח לראותך בהזדמנות אחרת 💙"
                            )
                        elif new_status == 'maybe':
                            whatsapp_service.send_text_message(
                                destination=sender_phone,
                                text="תודה על עדכון! אשמח אם תעדכן כשתדע בוודאות 💙"
                            )
                    else:
                        print(f"⚠️ No guest updated for id: {target_guest_id}")

                    print(f"✅ Updated guest status: guest_id={target_guest_id} -> {new_status}")

            cur.close()
            conn.close()

        # Handle text message (user might send a number directly)
        elif msg_type == 'text':
            text_content = message_payload.get('payload', {}).get('text', '').strip()

            # Check if it's a number (for guest count)
            if text_content.isdigit():
                try:
                    guest_count = int(text_content)
                    if 1 <= guest_count <= 50:  # Reasonable range
                        conn = get_db_connection()
                        cur = conn.cursor()
                        clean_phone = sender_phone.replace('+', '')

                        # Find guest via WhatsApp session first (event-specific)
                        print(f"🔍 Looking for guest with phone: {sender_phone} (cleaned: {clean_phone})")
                        cur.execute("""
                            SELECT ws.guest_id FROM whatsapp_sessions ws
                            WHERE ws.phone = %s OR ws.phone = %s OR ws.phone LIKE %s
                            LIMIT 1
                        """, (clean_phone, f'+{clean_phone}', f'%{clean_phone[-9:]}'))
                        session_row = cur.fetchone()

                        if session_row:
                            row = session_row
                            print(f"✅ Found guest via WhatsApp session: guest_id={session_row[0]}")
                        else:
                            cur.execute("""
                                SELECT id FROM guests
                                WHERE (phone LIKE %s OR phone LIKE %s OR phone LIKE %s)
                                  AND invitation_sent IS NOT NULL
                                ORDER BY invitation_sent DESC
                                LIMIT 1
                            """, (f'%{clean_phone}', f'+{clean_phone}', f'%{clean_phone[-9:]}'))
                            row = cur.fetchone()

                        if not row:
                            cur.execute("""
                                SELECT id FROM guests
                                WHERE phone LIKE %s OR phone LIKE %s OR phone LIKE %s
                                ORDER BY created_at DESC
                                LIMIT 1
                            """, (f'%{clean_phone}', f'+{clean_phone}', f'%{clean_phone[-9:]}'))
                            row = cur.fetchone()

                        if not row:
                            print(f"⚠️ No guest found for phone: {sender_phone}")
                            cur.close()
                            conn.close()
                            return {"status": "ignored", "reason": "Guest not found"}

                        target_guest_id = row[0]
                        print(f"🎯 Targeting guest_id={target_guest_id} for count update")

                        # Update only the targeted guest
                        cur.execute("""
                            UPDATE guests
                            SET attending_count = %s, guests_count = %s, status = 'confirmed', attendance_status = 'confirmed', updated_at = NOW()
                            WHERE id = %s
                            RETURNING id, name, phone, attending_count, status
                        """, (guest_count, guest_count, target_guest_id))

                        updated_guests = cur.fetchall()
                        print(f"✅ Updated {len(updated_guests)} guests:")
                        for guest in updated_guests:
                            print(f"   ID: {guest[0]}, Name: {guest[1]}, Phone: {guest[2]}, Count: {guest[3]}, Status: {guest[4]}")

                        conn.commit()
                        cur.close()
                        conn.close()

                        print(f"✅ Updated guest count from text: {sender_phone} -> {guest_count} guests")

                        # Send confirmation
                        whatsapp_service.send_text_message(
                            destination=sender_phone,
                            text=f"תודה רבה! רשמנו שמגיעים {guest_count} אנשים 🎉\nמחכים לראותכם! 💙"
                        )
                except ValueError:
                    print(f"⚠️ Could not parse number from text: {text_content}")

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
