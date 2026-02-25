"""
Invitation Image Upload Endpoint
Uploads invitation images to Cloudinary (reliable CDN, no external failures).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import os
import base64
import requests
from db import get_db_connection

router = APIRouter(prefix="/api/packages/events", tags=["invitation"])

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")


class InvitationImageUpload(BaseModel):
    image_data: str  # Base64 data URI or direct URL


def upload_to_cloudinary(image_data: str, event_id: int) -> str:
    """Upload base64 image to Cloudinary and return the secure URL."""
    # Strip data URI prefix
    if ',' in image_data:
        _, b64_content = image_data.split(',', 1)
    else:
        b64_content = image_data

    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

    response = requests.post(
        upload_url,
        data={
            "file": f"data:image/png;base64,{b64_content}",
            "public_id": f"invitations/event_{event_id}",
            "overwrite": "true",
            "resource_type": "image",
        },
        auth=(CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET),
        timeout=30,
    )

    if response.status_code == 200:
        result = response.json()
        url = result.get("secure_url", "")
        print(f"✅ Uploaded to Cloudinary: {url}")
        return url
    else:
        print(f"❌ Cloudinary upload failed: {response.status_code} - {response.text}")
        raise Exception(f"Cloudinary error {response.status_code}: {response.text}")


@router.post("/{event_id}/upload-invitation-image")
async def upload_invitation_image(
    event_id: int,
    payload: InvitationImageUpload
):
    """
    Upload invitation image for an event to Cloudinary.
    Returns a stable CDN URL stored in invitation_data.generated_image_url.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, invitation_data FROM events WHERE id = %s
        """, (event_id,))

        event = cur.fetchone()
        if not event:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="אירוע לא נמצא")

        invitation_data = event[1] if event[1] else {}
        image_data = payload.image_data
        image_url = None

        if image_data:
            if image_data.startswith('data:image'):
                # Base64 → Cloudinary
                image_url = upload_to_cloudinary(image_data, event_id)

            elif image_data.startswith('http'):
                # Already a Cloudinary URL — keep it
                if 'cloudinary.com' in image_data:
                    image_url = image_data
                    print(f"✅ Keeping existing Cloudinary URL: {image_url}")
                else:
                    # Old ImgBB or other URL — skip update, don't regress
                    existing = invitation_data.get('generated_image_url', '')
                    if existing and 'cloudinary.com' in existing:
                        image_url = existing
                        print(f"✅ Keeping existing Cloudinary URL from DB: {image_url}")
                    else:
                        image_url = image_data
                        print(f"⚠️ Using non-Cloudinary URL as fallback: {image_url}")

        if image_url:
            invitation_data['generated_image_url'] = image_url

            cur.execute("""
                UPDATE events
                SET invitation_data = %s, updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(invitation_data), event_id))

            conn.commit()

        cur.close()
        conn.close()

        return {
            "success": True,
            "message": "תמונת ההזמנה נשמרה בהצלחה",
            "image_url": image_url
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload invitation image error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"שגיאה בשמירת תמונת ההזמנה: {str(e)}"
        )
