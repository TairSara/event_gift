"""
Invitation Image Upload Endpoint
Handles uploading and storing invitation images for events
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import json
import os
import requests
from db import get_db_connection

router = APIRouter(prefix="/api/packages/events", tags=["invitation"])


class InvitationImageUpload(BaseModel):
    image_data: str  # Base64 or URL


@router.post("/{event_id}/upload-invitation-image")
async def upload_invitation_image(
    event_id: int,
    payload: InvitationImageUpload
):
    """
    Upload invitation image for an event (as base64 or URL)

    Args:
        event_id: Event ID
        payload: Contains image_data (base64 or URL)
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

        # Parse existing invitation_data
        invitation_data = event[1] if event[1] else {}

        # Handle image data
        image_url = None
        image_data = payload.image_data

        if image_data:
            if image_data.startswith('http'):
                # Direct URL
                image_url = image_data
                print(f"📸 Using direct URL: {image_url}")
            elif image_data.startswith('data:image'):
                # Base64 - upload to ImgBB
                try:
                    # Extract base64 part (remove data:image/png;base64, prefix)
                    base64_data = image_data.split(',')[1] if ',' in image_data else image_data

                    # Upload to ImgBB (free tier)
                    imgbb_api_key = os.getenv('IMGBB_API_KEY', 'e3b0c44298fc1c149afbf4c8996fb924')

                    print(f"📤 Uploading image to ImgBB...")
                    response = requests.post(
                        'https://api.imgbb.com/1/upload',
                        data={
                            'key': imgbb_api_key,
                            'image': base64_data
                        },
                        timeout=30
                    )

                    if response.status_code == 200:
                        result = response.json()
                        image_url = result['data']['url']
                        print(f"✅ Uploaded image to ImgBB: {image_url}")
                    else:
                        print(f"❌ ImgBB upload failed: {response.status_code} - {response.text}")
                        # Fallback: save base64 directly (not recommended for production)
                        image_url = image_data
                        print(f"⚠️ Saving base64 directly as fallback")
                except Exception as upload_error:
                    print(f"❌ Image upload error: {upload_error}")
                    # Fallback: save base64 directly
                    image_url = image_data
                    print(f"⚠️ Saving base64 directly due to upload error")

        # Update invitation_data with image URL
        invitation_data['generated_image_url'] = image_url

        cur.execute("""
            UPDATE events
            SET invitation_data = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id
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
