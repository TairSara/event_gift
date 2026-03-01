"""
RSVP API Endpoints for handling guest responses
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import hashlib
import psycopg2
from db import get_db_connection

router = APIRouter(prefix="/api/rsvp", tags=["RSVP"])


class PublicRSVPRegister(BaseModel):
    full_name: str
    phone: str
    attending_count: int = 1
    status: str = "confirmed"  # confirmed / declined


@router.get("/event/{event_id}")
async def get_public_event_details(event_id: int):
    """Get event details for public RSVP registration page (manual package)"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                e.id, e.event_name, e.event_title, e.event_date, e.event_time,
                e.event_location, e.invitation_data, e.message_settings,
                pp.package_name
            FROM events e
            LEFT JOIN package_purchases pp ON e.package_purchase_id = pp.id
            WHERE e.id = %s
        """, (event_id,))

        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="האירוע לא נמצא")

        event_id, event_name, event_title, event_date, event_time, \
            event_location, invitation_data, message_settings, package_name = row

        # Verify this is a manual package
        pkg = (package_name or "").lower()
        if "ידני" not in pkg and "בסיס" not in pkg:
            raise HTTPException(status_code=403, detail="קישור זה אינו זמין לחבילה זו")

        # Extract invitation image URL
        invitation_image_url = None
        if invitation_data and isinstance(invitation_data, dict):
            invitation_image_url = (
                invitation_data.get('generated_image_url') or
                invitation_data.get('image_url') or
                invitation_data.get('imageUrl')
            )

        # Get custom RSVP text
        rsvp_custom_text = None
        if message_settings and isinstance(message_settings, dict):
            rsvp_custom_text = message_settings.get('rsvp_custom_text')

        return {
            "event": {
                "id": event_id,
                "event_name": event_name or event_title,
                "event_date": event_date.isoformat() if event_date else None,
                "event_time": str(event_time) if event_time else None,
                "event_location": event_location,
                "invitation_image_url": invitation_image_url,
                "rsvp_custom_text": rsvp_custom_text
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting public event details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/event/{event_id}/register")
async def register_public_rsvp(event_id: int, data: PublicRSVPRegister):
    """Register a new guest via public RSVP link (manual package)"""
    try:
        if not data.full_name.strip():
            raise HTTPException(status_code=400, detail="יש להזין שם מלא")
        if not data.phone.strip():
            raise HTTPException(status_code=400, detail="יש להזין מספר טלפון")
        if data.status not in ['confirmed', 'declined']:
            raise HTTPException(status_code=400, detail="סטטוס לא תקין")
        if data.status == 'confirmed' and data.attending_count < 1:
            raise HTTPException(status_code=400, detail="מספר המגיעים חייב להיות לפחות 1")

        conn = get_db_connection()
        cur = conn.cursor()

        # Verify event exists and is manual package
        cur.execute("""
            SELECT e.id, pp.package_name
            FROM events e
            LEFT JOIN package_purchases pp ON e.package_purchase_id = pp.id
            WHERE e.id = %s
        """, (event_id,))

        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="האירוע לא נמצא")

        _, package_name = row
        pkg = (package_name or "").lower()
        if "ידני" not in pkg and "בסיס" not in pkg:
            cur.close()
            conn.close()
            raise HTTPException(status_code=403, detail="קישור זה אינו זמין לחבילה זו")

        # Check if guest with same phone already exists for this event
        cur.execute("""
            SELECT id FROM guests
            WHERE event_id = %s AND phone = %s
        """, (event_id, data.phone.strip()))

        existing = cur.fetchone()

        if existing:
            # Update existing guest
            cur.execute("""
                UPDATE guests
                SET name = %s, full_name = %s, attendance_status = %s,
                    guests_count = %s, attending_count = %s, updated_at = NOW()
                WHERE id = %s
            """, (
                data.full_name.strip(),
                data.full_name.strip(),
                data.status,
                data.attending_count if data.status == 'confirmed' else 0,
                data.attending_count if data.status == 'confirmed' else 0,
                existing[0]
            ))
            guest_id = existing[0]
        else:
            # Insert new guest
            cur.execute("""
                INSERT INTO guests (event_id, name, full_name, phone, attendance_status, guests_count, attending_count, contact_method)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'ידני')
                RETURNING id
            """, (
                event_id,
                data.full_name.strip(),
                data.full_name.strip(),
                data.phone.strip(),
                data.status,
                data.attending_count if data.status == 'confirmed' else 0,
                data.attending_count if data.status == 'confirmed' else 0
            ))
            guest_id = cur.fetchone()[0]

        conn.commit()
        cur.close()
        conn.close()

        print(f"✅ Public RSVP registered for event {event_id}: {data.full_name}, {data.status}")

        return {
            "success": True,
            "guest_id": guest_id,
            "status": data.status,
            "attending_count": data.attending_count if data.status == 'confirmed' else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error registering public RSVP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class RSVPResponse(BaseModel):
    status: str  # 'confirmed' or 'declined'
    attending_count: int = 0


def verify_token(guest_id: int, phone: str, event_name: str, token: str) -> bool:
    """Verify that the token matches for this guest"""
    expected_token = hashlib.sha256(f"{guest_id}-{phone}-{event_name}".encode()).hexdigest()[:16]
    return token == expected_token


@router.get("/{guest_id}")
async def get_rsvp_details(guest_id: int, token: str):
    """Get guest and event details for RSVP page"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get guest and event details including invitation image
        cur.execute("""
            SELECT
                g.id, g.name, g.phone, g.status, g.attending_count,
                e.id, e.event_name, e.event_date, e.event_time, e.event_location, e.invitation_data
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE g.id = %s
        """, (guest_id,))

        result = cur.fetchone()
        if not result:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Guest not found")

        guest_id, guest_name, phone, status, attending_count, \
            event_id, event_name, event_date, event_time, event_location, invitation_data = result

        # Extract invitation image URL
        invitation_image_url = None
        if invitation_data and isinstance(invitation_data, dict):
            invitation_image_url = (
                invitation_data.get('generated_image_url') or
                invitation_data.get('image_url') or
                invitation_data.get('imageUrl')
            )

        # Verify token
        if not verify_token(guest_id, phone or "", event_name or "", token):
            cur.close()
            conn.close()
            raise HTTPException(status_code=403, detail="Invalid token")

        cur.close()
        conn.close()

        return {
            "guest": {
                "id": guest_id,
                "name": guest_name,
                "phone": phone,
                "status": status,
                "attending_count": attending_count or 0
            },
            "event": {
                "id": event_id,
                "event_name": event_name,
                "event_date": event_date.isoformat() if event_date else None,
                "event_time": str(event_time) if event_time else None,
                "event_location": event_location,
                "invitation_image_url": invitation_image_url
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting RSVP details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{guest_id}")
async def submit_rsvp(guest_id: int, token: str, response: RSVPResponse):
    """Submit RSVP response (confirmed or declined)"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get guest details to verify token
        cur.execute("""
            SELECT g.phone, e.event_name
            FROM guests g
            JOIN events e ON g.event_id = e.id
            WHERE g.id = %s
        """, (guest_id,))

        result = cur.fetchone()
        if not result:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Guest not found")

        phone, event_name = result

        # Verify token
        if not verify_token(guest_id, phone or "", event_name or "", token):
            cur.close()
            conn.close()
            raise HTTPException(status_code=403, detail="Invalid token")

        # Validate status
        if response.status not in ['confirmed', 'declined']:
            raise HTTPException(status_code=400, detail="Status must be 'confirmed' or 'declined'")

        # Validate attending_count
        if response.status == 'confirmed' and response.attending_count <= 0:
            raise HTTPException(status_code=400, detail="Attending count must be greater than 0 for confirmed status")

        # Update guest status and attending count
        cur.execute("""
            UPDATE guests
            SET status = %s, attending_count = %s, updated_at = NOW()
            WHERE id = %s
        """, (response.status, response.attending_count, guest_id))

        conn.commit()
        cur.close()
        conn.close()

        print(f"✅ RSVP updated for guest {guest_id}: {response.status}, {response.attending_count} attendees")

        return {
            "success": True,
            "message": "RSVP submitted successfully",
            "guest_id": guest_id,
            "status": response.status,
            "attending_count": response.attending_count
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error submitting RSVP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
