"""
One-time migration script: re-upload all existing ImgBB invitation images to Cloudinary.

Run manually on the server after setting CLOUDINARY_* env vars:
    python migrate_images_to_cloudinary.py

What it does:
- Finds all events whose generated_image_url points to ImgBB (or is missing)
- Downloads the image from ImgBB (while it's still accessible)
- Uploads it to Cloudinary under invitations/event_{id}
- Updates the DB with the new stable Cloudinary URL
"""

import os
import json
import base64
import requests
from db import get_db_connection

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")


def upload_to_cloudinary(image_bytes: bytes, event_id: int) -> str:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    response = requests.post(
        upload_url,
        data={
            "file": f"data:image/png;base64,{b64}",
            "public_id": f"invitations/event_{event_id}",
            "overwrite": "true",
            "resource_type": "image",
        },
        auth=(CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET),
        timeout=30,
    )
    if response.status_code == 200:
        return response.json().get("secure_url", "")
    else:
        raise Exception(f"Cloudinary {response.status_code}: {response.text}")


def migrate():
    if not CLOUDINARY_CLOUD_NAME:
        print("❌ CLOUDINARY_CLOUD_NAME not set. Aborting.")
        return

    conn = get_db_connection()
    cur = conn.cursor()

    # Get all events that have invitation_data with a generated_image_url
    cur.execute("SELECT id, invitation_data FROM events WHERE invitation_data IS NOT NULL")
    rows = cur.fetchall()

    migrated = 0
    skipped = 0
    failed = 0

    for event_id, invitation_data in rows:
        if not invitation_data:
            continue

        url = invitation_data.get("generated_image_url", "")

        # Skip if already on Cloudinary
        if url and "cloudinary.com" in url:
            print(f"  ⏭️  Event {event_id}: already on Cloudinary, skipping")
            skipped += 1
            continue

        # Skip if no URL at all
        if not url:
            print(f"  ⚠️  Event {event_id}: no image URL, skipping")
            skipped += 1
            continue

        print(f"  📥 Event {event_id}: downloading from {url[:60]}...")

        try:
            dl = requests.get(url, timeout=15)
            if dl.status_code != 200:
                print(f"  ❌ Event {event_id}: download failed ({dl.status_code})")
                failed += 1
                continue

            new_url = upload_to_cloudinary(dl.content, event_id)
            invitation_data["generated_image_url"] = new_url

            cur.execute(
                "UPDATE events SET invitation_data = %s, updated_at = NOW() WHERE id = %s",
                (json.dumps(invitation_data), event_id)
            )
            conn.commit()
            print(f"  ✅ Event {event_id}: migrated → {new_url}")
            migrated += 1

        except Exception as e:
            print(f"  ❌ Event {event_id}: error — {e}")
            failed += 1

    cur.close()
    conn.close()

    print(f"\n🏁 Done. Migrated: {migrated} | Skipped: {skipped} | Failed: {failed}")


if __name__ == "__main__":
    migrate()
