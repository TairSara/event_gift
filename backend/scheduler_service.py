"""
Scheduler Service for Automated Message Sending

This service handles:
1. Creating scheduled messages when event date is set
2. Processing scheduled messages daily via cron job endpoint
3. Sending WhatsApp/SMS messages based on package type
"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import json
import psycopg2
from db import get_db_connection
from whatsapp_interactive import whatsapp_service, DEFAULT_INVITATION_IMAGE
from sms_service import sms_service
import hashlib


def format_israeli_phone(phone: str) -> str:
    """Format Israeli phone number to international format"""
    digits_only = ''.join(filter(str.isdigit, phone))

    if digits_only.startswith('972'):
        return digits_only

    if digits_only.startswith('0'):
        return '972' + digits_only[1:]

    return '972' + digits_only


def create_scheduled_messages_for_event(event_id: int, event_date: date, message_schedule: dict) -> List[dict]:
    """
    Create scheduled message entries for an event based on its message_schedule.

    Args:
        event_id: The event ID
        event_date: The date of the event
        message_schedule: Dict with schedule_type and days_before array

    Returns:
        List of created scheduled message records
    """
    conn = None
    cur = None
    created_messages = []

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        days_before = message_schedule.get('days_before', [21, 14, 7])

        for idx, days in enumerate(days_before, start=1):
            scheduled_date = event_date - timedelta(days=days)

            # Skip if scheduled date is in the past
            if scheduled_date < date.today():
                print(f"Skipping message {idx} for event {event_id} - scheduled date {scheduled_date} is in the past")
                continue

            # Check if already exists
            cur.execute("""
                SELECT id FROM scheduled_messages
                WHERE event_id = %s AND message_number = %s
            """, (event_id, idx))

            existing = cur.fetchone()
            if existing:
                print(f"Message {idx} for event {event_id} already scheduled")
                continue

            # Create new scheduled message
            cur.execute("""
                INSERT INTO scheduled_messages (event_id, message_number, scheduled_date, status)
                VALUES (%s, %s, %s, 'pending')
                RETURNING id, scheduled_date;
            """, (event_id, idx, scheduled_date))

            msg_id, sched_date = cur.fetchone()
            created_messages.append({
                'id': msg_id,
                'event_id': event_id,
                'message_number': idx,
                'scheduled_date': sched_date.isoformat(),
                'days_before': days
            })

            print(f"Created scheduled message {idx} for event {event_id}: {days} days before ({scheduled_date})")

        conn.commit()
        return created_messages

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating scheduled messages: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def get_messages_to_send_today() -> List[dict]:
    """
    Get all pending scheduled messages that should be sent today.

    Returns:
        List of scheduled messages with event details
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        today = date.today()

        cur.execute("""
            SELECT
                sm.id, sm.event_id, sm.message_number, sm.scheduled_date,
                e.event_title, e.event_date, e.event_time, e.event_location,
                e.invitation_data, pp.package_id
            FROM scheduled_messages sm
            JOIN events e ON sm.event_id = e.id
            LEFT JOIN package_purchases pp ON e.package_purchase_id = pp.id
            WHERE sm.scheduled_date <= %s
              AND sm.status = 'pending'
              AND e.status = 'active'
              AND e.event_date IS NOT NULL
            ORDER BY sm.event_id, sm.message_number;
        """, (today,))

        messages = []
        for row in cur.fetchall():
            messages.append({
                'scheduled_message_id': row[0],
                'event_id': row[1],
                'message_number': row[2],
                'scheduled_date': row[3],
                'event_title': row[4],
                'event_date': row[5],
                'event_time': row[6],
                'event_location': row[7],
                'invitation_data': row[8],
                'package_id': row[9]
            })

        return messages

    except Exception as e:
        print(f"Error getting messages to send: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def get_guests_for_event(event_id: int, exclude_responded: bool = False) -> List[dict]:
    """
    Get all guests with phone numbers for an event.

    Args:
        event_id: The event ID
        exclude_responded: If True, exclude guests who already confirmed or declined
                          (status in 'confirmed', 'declined')
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if exclude_responded:
            cur.execute("""
                SELECT id, name, phone, contact_method
                FROM guests
                WHERE event_id = %s
                  AND phone IS NOT NULL
                  AND phone != ''
                  AND (status IS NULL OR status NOT IN ('confirmed', 'declined'))
            """, (event_id,))
        else:
            cur.execute("""
                SELECT id, name, phone, contact_method
                FROM guests
                WHERE event_id = %s
                  AND phone IS NOT NULL
                  AND phone != ''
            """, (event_id,))

        guests = []
        for row in cur.fetchall():
            guests.append({
                'id': row[0],
                'name': row[1],
                'phone': row[2],
                'contact_method': row[3] or 'WhatsApp'
            })

        return guests

    except Exception as e:
        print(f"Error getting guests for event {event_id}: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def send_whatsapp_invitation(guest: dict, event_data: dict) -> dict:
    """Send WhatsApp invitation to a guest"""
    try:
        formatted_phone = format_israeli_phone(guest['phone'])

        # Format date and time
        event_date = event_data['event_date']
        if isinstance(event_date, date):
            formatted_date = event_date.strftime('%d/%m/%Y')
        else:
            formatted_date = str(event_date)

        event_time = event_data.get('event_time')
        if event_time:
            if hasattr(event_time, 'strftime'):
                formatted_time = event_time.strftime('%H:%M')
            else:
                formatted_time = str(event_time)
        else:
            formatted_time = '18:00'

        # Get image URL from invitation_data
        invitation_data = event_data.get('invitation_data')
        image_url = None
        if invitation_data and isinstance(invitation_data, dict):
            image_url = (
                invitation_data.get('generated_image_url') or
                invitation_data.get('image_url') or
                invitation_data.get('imageUrl')
            )
        if not image_url:
            image_url = DEFAULT_INVITATION_IMAGE

        result = whatsapp_service.send_event_invitation_template(
            destination=formatted_phone,
            guest_name=guest['name'],
            event_name=event_data['event_title'],
            event_date=formatted_date,
            event_time=formatted_time,
            event_location=event_data.get('event_location') or "יודיע בהמשך",
            image_url=image_url
        )

        return {
            'success': result.get('success', False),
            'guest_id': guest['id'],
            'guest_name': guest['name'],
            'phone': formatted_phone,
            'error': result.get('error') if not result.get('success') else None
        }

    except Exception as e:
        return {
            'success': False,
            'guest_id': guest['id'],
            'guest_name': guest['name'],
            'phone': guest['phone'],
            'error': str(e)
        }


def send_whatsapp_reminder(guest: dict, event_data: dict) -> dict:
    """Send WhatsApp reminder to a guest (uses reminder template)"""
    try:
        formatted_phone = format_israeli_phone(guest['phone'])

        # Get image URL from invitation_data
        invitation_data = event_data.get('invitation_data')
        image_url = None
        if invitation_data and isinstance(invitation_data, dict):
            image_url = (
                invitation_data.get('generated_image_url') or
                invitation_data.get('image_url') or
                invitation_data.get('imageUrl')
            )
        if not image_url:
            image_url = DEFAULT_INVITATION_IMAGE

        result = whatsapp_service.send_event_reminder_template(
            destination=formatted_phone,
            event_name=event_data['event_title'],
            image_url=image_url
        )

        return {
            'success': result.get('success', False),
            'guest_id': guest['id'],
            'guest_name': guest['name'],
            'phone': formatted_phone,
            'error': result.get('error') if not result.get('success') else None
        }

    except Exception as e:
        return {
            'success': False,
            'guest_id': guest['id'],
            'guest_name': guest['name'],
            'phone': guest['phone'],
            'error': str(e)
        }


def send_sms_invitation(guest: dict, event_data: dict) -> dict:
    """Send SMS invitation to a guest"""
    try:
        # Generate RSVP link
        token = hashlib.sha256(
            f"{guest['id']}-{guest['phone']}-{event_data['event_title']}".encode()
        ).hexdigest()[:16]
        rsvp_link = f"https://event-gift-frontend.onrender.com/rsvp/{guest['id']}?token={token}"

        result = sms_service.send_event_invitation_sms(
            destination=guest['phone'],
            event_name=event_data['event_title'],
            rsvp_link=rsvp_link
        )

        return {
            'success': result.get('success', False),
            'guest_id': guest['id'],
            'guest_name': guest['name'],
            'phone': guest['phone'],
            'error': result.get('error') if not result.get('success') else None
        }

    except Exception as e:
        return {
            'success': False,
            'guest_id': guest['id'],
            'guest_name': guest['name'],
            'phone': guest['phone'],
            'error': str(e)
        }


def process_scheduled_message(scheduled_msg: dict) -> dict:
    """
    Process a single scheduled message - send to all guests.

    Package types:
    - package_id = 1: Manual (WhatsApp)
    - package_id = 2: SMS only
    - package_id = 3: WhatsApp only
    - package_id = 4: Full package (WhatsApp)
    """
    event_id = scheduled_msg['event_id']
    scheduled_message_id = scheduled_msg['scheduled_message_id']
    package_id = scheduled_msg.get('package_id')
    message_number = scheduled_msg['message_number']

    # Determine send method based on package
    use_sms = package_id == 2

    # For message_number >= 2, use reminder template and skip guests who already responded
    is_reminder = message_number >= 2

    print(f"\n{'='*50}")
    print(f"Processing scheduled message {scheduled_message_id}")
    print(f"Event: {scheduled_msg['event_title']} (ID: {event_id})")
    print(f"Message #{message_number} ({'REMINDER' if is_reminder else 'INVITATION'})")
    print(f"Package ID: {package_id} -> Using {'SMS' if use_sms else 'WhatsApp'}")
    if is_reminder:
        print(f"Skipping guests who already confirmed/declined")
    print(f"{'='*50}")

    # Get guests - for rounds 2+, exclude guests who already responded
    guests = get_guests_for_event(event_id, exclude_responded=is_reminder)
    if not guests:
        no_guests_msg = "No guests to send to" if not is_reminder else "No pending guests to remind (all already responded)"
        print(f"{no_guests_msg} for event {event_id}")
        update_scheduled_message_status(scheduled_message_id, 'completed', 0, 0, no_guests_msg)
        return {
            'scheduled_message_id': scheduled_message_id,
            'status': 'completed',
            'sent': 0,
            'failed': 0,
            'message': no_guests_msg
        }

    print(f"Found {len(guests)} guests to notify")

    # Send to each guest
    sent_count = 0
    failed_count = 0
    errors = []

    for guest in guests:
        if use_sms:
            result = send_sms_invitation(guest, scheduled_msg)
        elif is_reminder:
            result = send_whatsapp_reminder(guest, scheduled_msg)
        else:
            result = send_whatsapp_invitation(guest, scheduled_msg)

        if result['success']:
            sent_count += 1
            print(f"  ✓ Sent to {guest['name']} ({guest['phone']})")
        else:
            failed_count += 1
            errors.append(f"{guest['name']}: {result.get('error', 'Unknown error')}")
            print(f"  ✗ Failed for {guest['name']}: {result.get('error')}")

    # Update status
    error_message = "; ".join(errors) if errors else None
    status = 'completed' if failed_count == 0 else 'partial'

    update_scheduled_message_status(scheduled_message_id, status, sent_count, failed_count, error_message)

    print(f"\nResults: {sent_count} sent, {failed_count} failed")

    return {
        'scheduled_message_id': scheduled_message_id,
        'event_id': event_id,
        'message_number': scheduled_msg['message_number'],
        'status': status,
        'sent': sent_count,
        'failed': failed_count,
        'errors': errors if errors else None
    }


def update_scheduled_message_status(
    scheduled_message_id: int,
    status: str,
    sent_count: int,
    failed_count: int,
    error_message: Optional[str] = None
):
    """Update the status of a scheduled message"""
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE scheduled_messages
            SET status = %s,
                sent_at = NOW(),
                guests_sent_count = %s,
                guests_failed_count = %s,
                error_message = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (status, sent_count, failed_count, error_message, scheduled_message_id))

        conn.commit()

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating scheduled message status: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def process_all_scheduled_messages() -> dict:
    """
    Main function to process all scheduled messages for today.
    Called by the cron job endpoint.

    Returns:
        Summary of processing results
    """
    print("\n" + "="*60)
    print(f"SCHEDULED MESSAGE PROCESSING - {datetime.now().isoformat()}")
    print("="*60)

    messages = get_messages_to_send_today()

    if not messages:
        print("No scheduled messages to process today")
        return {
            'status': 'success',
            'processed': 0,
            'message': 'No scheduled messages to process today'
        }

    print(f"Found {len(messages)} scheduled messages to process")

    results = []
    for msg in messages:
        result = process_scheduled_message(msg)
        results.append(result)

    total_sent = sum(r['sent'] for r in results)
    total_failed = sum(r['failed'] for r in results)

    print("\n" + "="*60)
    print("PROCESSING COMPLETE")
    print(f"Messages processed: {len(results)}")
    print(f"Total guests notified: {total_sent}")
    print(f"Total failures: {total_failed}")
    print("="*60 + "\n")

    return {
        'status': 'success',
        'processed': len(results),
        'total_sent': total_sent,
        'total_failed': total_failed,
        'results': results
    }


def update_event_schedules_on_date_change(event_id: int, new_event_date: date, message_schedule: dict):
    """
    When event date changes, update or recreate scheduled messages.
    Deletes pending messages and creates new ones based on new date.
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Delete pending (not yet sent) scheduled messages
        cur.execute("""
            DELETE FROM scheduled_messages
            WHERE event_id = %s AND status = 'pending'
        """, (event_id,))

        deleted = cur.rowcount
        print(f"Deleted {deleted} pending scheduled messages for event {event_id}")

        conn.commit()

        # Create new scheduled messages
        created = create_scheduled_messages_for_event(event_id, new_event_date, message_schedule)

        return {
            'deleted': deleted,
            'created': len(created)
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating event schedules: {e}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
