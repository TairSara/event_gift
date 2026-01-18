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
