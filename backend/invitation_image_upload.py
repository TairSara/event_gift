"""
Invitation Image Upload Endpoint
Stores invitation images as local files served via FastAPI static files.
No dependency on external APIs (no ImgBB).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import os
import base64
import uuid
from db import get_db_connection

router = APIRouter(prefix="/api/packages/events", tags=["invitation"])

# Directory where images are saved
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads", "invitations")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Public base URL for serving images (same var used in other modules)
API_BASE_URL = os.getenv("BACKEND_URL", "https://event-gift.onrender.com")


class InvitationImageUpload(BaseModel):
    image_data: str  # Base64 data URI or direct URL


@router.post("/{event_id}/upload-invitation-image")
async def upload_invitation_image(
    event_id: int,
    payload: InvitationImageUpload
):
    """
    Upload invitation image for an event.
    Saves the image as a PNG file on the server and returns a public URL.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Verify event exists
        cur.execute("""
            SELECT id, invitation_data FROM events
            WHERE id = %s
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
            if image_data.startswith('http'):
                # Already a URL — use as-is (but prefer re-uploading if it's ImgBB)
                if 'ibb.co' in image_data or 'imgbb' in image_data:
                    print(f"⚠️ ImgBB URL detected, skipping re-use: {image_data}")
                    # Don't update — keep existing local URL if already saved
                    existing_url = invitation_data.get('generated_image_url', '')
                    if existing_url and 'ibb.co' not in existing_url and 'imgbb' not in existing_url:
                        image_url = existing_url
                        print(f"✅ Keeping existing local URL: {image_url}")
                    else:
                        image_url = image_data  # fallback
                else:
                    image_url = image_data
                    print(f"📸 Using direct URL: {image_url}")

            elif image_data.startswith('data:image'):
                # Base64 data URI — save as PNG file
                try:
                    # Strip the data URI prefix
                    if ',' in image_data:
                        header, b64_content = image_data.split(',', 1)
                    else:
                        b64_content = image_data

                    img_bytes = base64.b64decode(b64_content)

                    # Generate unique filename
                    filename = f"event_{event_id}_{uuid.uuid4().hex[:8]}.png"
                    filepath = os.path.join(UPLOADS_DIR, filename)

                    with open(filepath, 'wb') as f:
                        f.write(img_bytes)

                    image_url = f"{API_BASE_URL}/uploads/invitations/{filename}"
                    print(f"✅ Saved invitation image locally: {filepath}")
                    print(f"🌐 Public URL: {image_url}")

                except Exception as save_error:
                    print(f"❌ Failed to save image locally: {save_error}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"שגיאה בשמירת התמונה: {str(save_error)}"
                    )

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
