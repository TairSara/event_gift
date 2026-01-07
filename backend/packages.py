from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import openpyxl
from io import BytesIO
import traceback

import psycopg2
from db import get_db_connection

router = APIRouter(
    prefix="/api/packages",
    tags=["packages"]
)

# ========== Models ==========

class PackagePurchaseCreate(BaseModel):
    package_id: int
    package_name: str
    user_id: int

class EventCreate(BaseModel):
    user_id: int
    package_purchase_id: Optional[int] = None
    event_type: str
    event_title: str
    event_date: Optional[str] = None
    event_location: Optional[str] = None
    invitation_data: Optional[dict] = None

class EventUpdate(BaseModel):
    event_title: Optional[str] = None
    event_date: Optional[str] = None
    event_location: Optional[str] = None
    invitation_data: Optional[dict] = None
    status: Optional[str] = None

class GuestCreate(BaseModel):
    event_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    quantity: int = 1
    contact_method: str = "WhatsApp"
    attendance_status: str = "pending"
    table_number: Optional[int] = None

class GuestUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    quantity: Optional[int] = None
    contact_method: Optional[str] = None
    attendance_status: Optional[str] = None
    table_number: Optional[int] = None

class GuestBulkCreate(BaseModel):
    event_id: int
    guests: List[dict]


# ========== Package Endpoints ==========

@router.get("/list")
def get_packages():
    """
    מחזיר את רשימת כל החבילות הזמינות
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, name, tagline, price, price_unit, color, popular, features, note
            FROM packages
            ORDER BY id;
        """)

        packages = []
        for row in cur.fetchall():
            packages.append({
                "id": row[0],
                "name": row[1],
                "tagline": row[2],
                "price": row[3],
                "price_unit": row[4],
                "color": row[5],
                "popular": row[6],
                "features": row[7],
                "note": row[8]
            })

        return {"packages": packages}

    except Exception as e:
        print(f"Get packages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/purchase", status_code=status.HTTP_201_CREATED)
def purchase_package(purchase: PackagePurchaseCreate):
    """
    רכישת חבילה על ידי משתמש
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # שמירת הרכישה
        cur.execute("""
            INSERT INTO package_purchases (user_id, package_id, package_name, status)
            VALUES (%s, %s, %s, 'active')
            RETURNING id, purchased_at;
        """, (purchase.user_id, purchase.package_id, purchase.package_name))

        purchase_id, purchased_at = cur.fetchone()
        conn.commit()

        return {
            "id": purchase_id,
            "user_id": purchase.user_id,
            "package_id": purchase.package_id,
            "package_name": purchase.package_name,
            "purchased_at": purchased_at.isoformat(),
            "status": "active",
            "message": "הרכישה בוצעה בהצלחה!"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Purchase package error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בביצוע הרכישה"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/user/{user_id}/purchases")
def get_user_purchases(user_id: int):
    """
    מחזיר את כל הרכישות של משתמש
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, package_id, package_name, purchased_at, status
            FROM package_purchases
            WHERE user_id = %s AND status = 'active'
            ORDER BY purchased_at DESC;
        """, (user_id,))

        purchases = []
        for row in cur.fetchall():
            purchases.append({
                "id": row[0],
                "package_id": row[1],
                "package_name": row[2],
                "purchased_at": row[3].isoformat() if row[3] else None,
                "status": row[4]
            })

        return {"purchases": purchases}

    except Exception as e:
        print(f"Get user purchases error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ========== Event Endpoints ==========

@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate):
    """
    יצירת אירוע חדש
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקה שהמשתמש רכש חבילה
        if not event.package_purchase_id:
            # אם לא צוין package_purchase_id, ננסה למצוא חבילה פעילה
            cur.execute("""
                SELECT id FROM package_purchases
                WHERE user_id = %s AND status = 'active'
                ORDER BY purchased_at DESC
                LIMIT 1
            """, (event.user_id,))

            purchase = cur.fetchone()
            if not purchase:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="יש לרכוש חבילה לפני יצירת אירוע"
                )
            event.package_purchase_id = purchase[0]

        # וולידציה שהחבילה שייכת למשתמש ופעילה
        cur.execute("""
            SELECT pp.id, pp.package_id, p.max_guests
            FROM package_purchases pp
            JOIN packages p ON pp.package_id = p.id
            WHERE pp.id = %s AND pp.user_id = %s AND pp.status = 'active'
        """, (event.package_purchase_id, event.user_id))

        purchase_data = cur.fetchone()
        if not purchase_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="החבילה לא נמצאה או אינה פעילה"
            )

        # המרת invitation_data ל-JSON
        invitation_json = json.dumps(event.invitation_data) if event.invitation_data else None

        cur.execute("""
            INSERT INTO events (
                user_id, package_purchase_id, event_type, event_title, event_name,
                event_date, event_location, invitation_data, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active')
            RETURNING id, created_at;
        """, (
            event.user_id,
            event.package_purchase_id,
            event.event_type,
            event.event_title,
            event.event_title,  # נשתמש ב-event_title גם עבור event_name
            event.event_date,
            event.event_location,
            invitation_json
        ))

        event_id, created_at = cur.fetchone()

        # עדכון החבילה לקשר אותה לאירוע
        cur.execute("""
            UPDATE package_purchases
            SET event_id = %s
            WHERE id = %s
        """, (event_id, event.package_purchase_id))

        conn.commit()

        return {
            "id": event_id,
            "user_id": event.user_id,
            "event_type": event.event_type,
            "event_title": event.event_title,
            "created_at": created_at.isoformat(),
            "status": "active",
            "package_purchase_id": event.package_purchase_id,
            "message": "האירוע נוצר בהצלחה!"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Create event error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה ביצירת האירוע"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/events/user/{user_id}")
def get_user_events(user_id: int):
    """
    מחזיר את כל האירועים של משתמש עם סטטיסטיקה
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                e.id, e.event_type, e.event_title, e.event_date,
                e.event_location, e.status, e.created_at, e.package_purchase_id,
                COUNT(DISTINCT g.id) as total_guests,
                COUNT(DISTINCT CASE WHEN g.attendance_status = 'confirmed' THEN g.id END) as confirmed_guests,
                COUNT(DISTINCT CASE WHEN gift.id IS NOT NULL THEN gift.id END) as total_gifts,
                COALESCE(SUM(gift.amount), 0) as total_gift_amount
            FROM events e
            LEFT JOIN guests g ON e.id = g.event_id
            LEFT JOIN gifts gift ON e.id = gift.event_id
            WHERE e.user_id = %s
            GROUP BY e.id
            ORDER BY e.created_at DESC;
        """, (user_id,))

        events = []
        for row in cur.fetchall():
            event_date = row[3]

            # קביעת סטטוס האירוע לפי תאריך
            event_status = row[5]
            if event_date:
                if isinstance(event_date, str):
                    event_date_obj = datetime.fromisoformat(event_date)
                else:
                    event_date_obj = event_date

                if event_date_obj < datetime.now():
                    event_status = "completed"
                elif event_date_obj > datetime.now():
                    event_status = "scheduled"
                else:
                    event_status = "active"

            total_guests = row[8] or 0
            confirmed_guests = row[9] or 0
            confirmation_rate = (confirmed_guests / total_guests * 100) if total_guests > 0 else 0

            events.append({
                "id": row[0],
                "event_type": row[1],
                "event_title": row[2],
                "event_date": event_date.isoformat() if event_date else None,
                "event_location": row[4],
                "status": event_status,
                "created_at": row[6].isoformat() if row[6] else None,
                "package_purchase_id": row[7],
                "statistics": {
                    "total_guests": total_guests,
                    "confirmed_guests": confirmed_guests,
                    "confirmation_rate": round(confirmation_rate, 1),
                    "total_gifts": row[10] or 0,
                    "total_gift_amount": float(row[11]) if row[11] else 0.0
                }
            })

        return {"events": events}

    except Exception as e:
        print(f"Get user events error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/events/{event_id}")
def get_event(event_id: int):
    """
    מחזיר פרטי אירוע ספציפי
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                id, user_id, package_purchase_id, event_type, event_title,
                event_date, event_location, invitation_data, status, created_at
            FROM events
            WHERE id = %s;
        """, (event_id,))

        row = cur.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="האירוע לא נמצא"
            )

        return {
            "id": row[0],
            "user_id": row[1],
            "package_purchase_id": row[2],
            "event_type": row[3],
            "event_title": row[4],
            "event_date": row[5].isoformat() if row[5] else None,
            "event_location": row[6],
            "invitation_data": row[7],
            "status": row[8],
            "created_at": row[9].isoformat() if row[9] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get event error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.put("/events/{event_id}")
def update_event(event_id: int, event: EventUpdate):
    """
    עדכון פרטי אירוע
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בניית שאילתת עדכון דינמית
        updates = []
        params = []

        if event.event_title is not None:
            updates.append("event_title = %s")
            params.append(event.event_title)

        if event.event_date is not None:
            updates.append("event_date = %s")
            params.append(event.event_date)

        if event.event_location is not None:
            updates.append("event_location = %s")
            params.append(event.event_location)

        if event.invitation_data is not None:
            updates.append("invitation_data = %s")
            params.append(json.dumps(event.invitation_data))

        if event.status is not None:
            updates.append("status = %s")
            params.append(event.status)

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="לא נמצאו שדות לעדכון"
            )

        updates.append("updated_at = NOW()")
        params.append(event_id)

        query = f"""
            UPDATE events
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id;
        """

        cur.execute(query, params)
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="האירוע לא נמצא"
            )

        conn.commit()

        return {"message": "האירוע עודכן בהצלחה", "id": result[0]}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Update event error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בעדכון האירוע"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.put("/purchases/{purchase_id}/use")
def mark_package_as_used(purchase_id: int):
    """
    סימון חבילה כמשומשת
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE package_purchases
            SET status = 'used'
            WHERE id = %s
            RETURNING id;
        """, (purchase_id,))

        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="החבילה לא נמצאה"
            )

        conn.commit()

        return {"message": "החבילה סומנה כמשומשת", "id": result[0]}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Mark package as used error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בעדכון החבילה"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.put("/events/{event_id}/assign-package/{package_purchase_id}")
def assign_package_to_event(event_id: int, package_purchase_id: int):
    """
    שיוך חבילה לאירוע קיים
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE events
            SET package_purchase_id = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id;
        """, (package_purchase_id, event_id))

        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="האירוע לא נמצא"
            )

        conn.commit()

        return {"message": "החבילה שוייכה לאירוע בהצלחה", "event_id": result[0]}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Assign package error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשיוך החבילה"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ========== Guest Endpoints ==========

@router.post("/events/{event_id}/guests", status_code=status.HTTP_201_CREATED)
def create_guest(event_id: int, guest: GuestCreate):
    """
    הוספת מוזמן לאירוע
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקת מגבלת אורחים לפי החבילה
        cur.execute("""
            SELECT p.max_guests, COUNT(g.id) as current_guests
            FROM events e
            JOIN package_purchases pp ON e.package_purchase_id = pp.id
            JOIN packages p ON pp.package_id = p.id
            LEFT JOIN guests g ON e.id = g.event_id
            WHERE e.id = %s
            GROUP BY p.max_guests
        """, (event_id,))

        limit_data = cur.fetchone()
        if limit_data:
            max_guests, current_guests = limit_data
            if current_guests >= max_guests:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"הגעת למגבלת האורחים של החבילה ({max_guests} אורחים)"
                )

        cur.execute("""
            INSERT INTO guests (
                event_id, full_name, name, phone, email, guests_count,
                contact_method, attendance_status, table_number
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at;
        """, (
            event_id,
            guest.name,  # full_name
            guest.name,  # name (for backwards compatibility)
            guest.phone,
            guest.email,
            guest.quantity or 1,
            guest.contact_method,
            guest.attendance_status or 'pending',
            guest.table_number
        ))

        guest_id, created_at = cur.fetchone()
        conn.commit()

        return {
            "id": guest_id,
            "event_id": event_id,
            "name": guest.name,
            "phone": guest.phone,
            "email": guest.email,
            "quantity": guest.quantity,
            "contact_method": guest.contact_method,
            "attendance_status": guest.attendance_status,
            "table_number": guest.table_number,
            "created_at": created_at.isoformat(),
            "message": "המוזמן נוסף בהצלחה!"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Create guest error: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בהוספת המוזמן"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/events/{event_id}/guests/bulk", status_code=status.HTTP_201_CREATED)
def create_guests_bulk(event_id: int, data: GuestBulkCreate):
    """
    הוספת מוזמנים בכמות גדולה (לדוגמה מקובץ Excel)
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        added_guests = []

        for guest_data in data.guests:
            cur.execute("""
                INSERT INTO guests (
                    event_id, name, phone, email, guests_count,
                    contact_method, attendance_status, table_number
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at;
            """, (
                event_id,
                guest_data.get("name"),
                guest_data.get("phone"),
                guest_data.get("email"),
                guest_data.get("quantity", 1),
                guest_data.get("contact_method", "WhatsApp"),
                guest_data.get("attendance_status", "pending"),
                guest_data.get("table_number")
            ))

            guest_id, created_at = cur.fetchone()
            added_guests.append({
                "id": guest_id,
                "name": guest_data.get("name"),
                "created_at": created_at.isoformat()
            })

        conn.commit()

        return {
            "message": f"{len(added_guests)} מוזמנים נוספו בהצלחה!",
            "guests": added_guests
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Create guests bulk error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בהוספת המוזמנים"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/events/{event_id}/guests")
def get_event_guests(event_id: int):
    """
    קבלת רשימת כל המוזמנים לאירוע
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                id, name, phone, email, guests_count, contact_method,
                attendance_status, table_number, created_at, updated_at,
                status, attending_count
            FROM guests
            WHERE event_id = %s
            ORDER BY created_at DESC;
        """, (event_id,))

        guests = []
        for row in cur.fetchall():
            # Use status if available, otherwise fall back to attendance_status
            current_status = row[10] if row[10] else row[6]
            current_count = row[11] if row[11] is not None else row[4]

            guests.append({
                "id": row[0],
                "name": row[1],
                "phone": row[2],
                "email": row[3],
                "guests_count": current_count,
                "quantity": current_count,  # Keep for backward compatibility
                "contact_method": row[5],
                "attendance_status": current_status,  # Use synced status
                "status": current_status,  # RSVP status
                "attending_count": current_count,  # RSVP count
                "table_number": row[7],
                "created_at": row[8].isoformat() if row[8] else None,
                "updated_at": row[9].isoformat() if row[9] else None
            })

        return {"guests": guests}

    except Exception as e:
        print(f"Get event guests error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בקבלת המוזמנים"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.put("/guests/{guest_id}")
def update_guest(guest_id: int, guest: GuestUpdate):
    """
    עדכון פרטי מוזמן
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        updates = []
        params = []

        if guest.name is not None:
            updates.append("name = %s")
            params.append(guest.name)

        if guest.phone is not None:
            updates.append("phone = %s")
            params.append(guest.phone)

        if guest.email is not None:
            updates.append("email = %s")
            params.append(guest.email)

        if guest.quantity is not None:
            updates.append("guests_count = %s")
            params.append(guest.quantity)

        if guest.contact_method is not None:
            updates.append("contact_method = %s")
            params.append(guest.contact_method)

        if guest.attendance_status is not None:
            updates.append("attendance_status = %s")
            params.append(guest.attendance_status)
            # Also update the status field for RSVP sync
            updates.append("status = %s")
            params.append(guest.attendance_status)
            # Reset attending_count if status is pending or declined
            if guest.attendance_status in ['pending', 'declined']:
                updates.append("attending_count = %s")
                params.append(0)

        if guest.table_number is not None:
            updates.append("table_number = %s")
            params.append(guest.table_number)

        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="לא נמצאו שדות לעדכון"
            )

        updates.append("updated_at = NOW()")
        params.append(guest_id)

        query = f"""
            UPDATE guests
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id;
        """

        cur.execute(query, params)
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="המוזמן לא נמצא"
            )

        conn.commit()

        return {"message": "המוזמן עודכן בהצלחה", "id": result[0]}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Update guest error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בעדכון המוזמן"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.delete("/guests/{guest_id}")
def delete_guest(guest_id: int):
    """
    מחיקת מוזמן
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            DELETE FROM guests
            WHERE id = %s
            RETURNING id;
        """, (guest_id,))

        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="המוזמן לא נמצא"
            )

        conn.commit()

        return {"message": "המוזמן נמחק בהצלחה", "id": result[0]}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Delete guest error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה במחיקת המוזמן"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/events/{event_id}/guests/upload-excel", status_code=status.HTTP_201_CREATED)
async def upload_guests_excel(event_id: int, file: UploadFile = File(...)):
    """
    העלאת קובץ Excel עם מוזמנים
    העמודות הנתמכות: שם/name, טלפון/phone, אימייל/email, כמות/quantity,
                      דרך יצירת קשר/contact_method, סטטוס/attendance_status, שולחן/table_number
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="יש להעלות קובץ Excel בלבד (.xlsx או .xls)"
        )

    conn = None
    cur = None

    try:
        # קריאת הקובץ
        contents = await file.read()
        workbook = openpyxl.load_workbook(BytesIO(contents))
        sheet = workbook.active

        # קריאת שורת הכותרות
        headers = []
        for cell in sheet[1]:
            if cell.value:
                headers.append(str(cell.value).strip().lower())

        # מיפוי עמודות (תמיכה בעברית ואנגלית)
        column_map = {
            'name': ['name', 'שם', 'שם מלא', 'guest name'],
            'phone': ['phone', 'טלפון', 'מספר טלפון', 'telephone'],
            'email': ['email', 'אימייל', 'דוא"ל', 'mail'],
            'quantity': ['quantity', 'כמות', 'מספר אנשים', 'amount'],
            'contact_method': ['contact_method', 'contact method', 'דרך יצירת קשר', 'contact'],
            'attendance_status': ['attendance_status', 'status', 'סטטוס', 'אישור'],
            'table_number': ['table_number', 'table', 'שולחן', 'מספר שולחן']
        }

        # מציאת אינדקסים של העמודות
        column_indices = {}
        for field, possible_names in column_map.items():
            for idx, header in enumerate(headers):
                if header in possible_names:
                    column_indices[field] = idx
                    break

        # בדיקה שיש לפחות עמודת שם
        if 'name' not in column_indices:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="הקובץ חייב להכיל לפחות עמודת 'שם' או 'name'"
            )

        conn = get_db_connection()
        cur = conn.cursor()

        added_guests = []
        errors = []

        # עיבוד השורות
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                # יצירת אובייקט מוזמן
                guest_data = {
                    'name': row[column_indices['name']] if 'name' in column_indices and len(row) > column_indices['name'] else None,
                    'phone': row[column_indices['phone']] if 'phone' in column_indices and len(row) > column_indices['phone'] else None,
                    'email': row[column_indices['email']] if 'email' in column_indices and len(row) > column_indices['email'] else None,
                    'quantity': row[column_indices['quantity']] if 'quantity' in column_indices and len(row) > column_indices['quantity'] else 1,
                    'contact_method': row[column_indices['contact_method']] if 'contact_method' in column_indices and len(row) > column_indices['contact_method'] else 'WhatsApp',
                    'attendance_status': row[column_indices['attendance_status']] if 'attendance_status' in column_indices and len(row) > column_indices['attendance_status'] else 'pending',
                    'table_number': row[column_indices['table_number']] if 'table_number' in column_indices and len(row) > column_indices['table_number'] else None,
                }

                # דילוג על שורות ריקות
                if not guest_data['name'] or str(guest_data['name']).strip() == '':
                    continue

                # המרת כמות למספר
                if guest_data['quantity']:
                    try:
                        guest_data['quantity'] = int(guest_data['quantity'])
                    except:
                        guest_data['quantity'] = 1

                # המרת מספר שולחן למספר
                if guest_data['table_number']:
                    try:
                        guest_data['table_number'] = int(guest_data['table_number'])
                    except:
                        guest_data['table_number'] = None

                # הכנסה לדאטאבייס
                cur.execute("""
                    INSERT INTO guests (
                        event_id, name, phone, email, guests_count,
                        contact_method, attendance_status, table_number
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at;
                """, (
                    event_id,
                    str(guest_data['name']).strip(),
                    str(guest_data['phone']).strip() if guest_data['phone'] else None,
                    str(guest_data['email']).strip() if guest_data['email'] else None,
                    guest_data['quantity'],
                    guest_data['contact_method'],
                    guest_data['attendance_status'],
                    guest_data['table_number']
                ))

                guest_id, created_at = cur.fetchone()
                added_guests.append({
                    "id": guest_id,
                    "name": guest_data['name'],
                    "row": row_idx
                })

            except Exception as e:
                errors.append({
                    "row": row_idx,
                    "error": str(e)
                })

        conn.commit()

        return {
            "message": f"{len(added_guests)} מוזמנים נוספו בהצלחה!",
            "added": len(added_guests),
            "errors": errors if errors else None,
            "guests": added_guests
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Upload Excel error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"שגיאה בעיבוד הקובץ: {str(e)}"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
