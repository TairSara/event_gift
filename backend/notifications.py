from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import psycopg2
from db import get_db_connection

router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"]
)

# ========== Models ==========

class NotificationCreate(BaseModel):
    user_id: int
    event_id: Optional[int] = None
    notification_type: str
    title: str
    message: str

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    event_id: Optional[int]
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: str

# ========== Helper Functions ==========

def create_notification(user_id: int, event_id: Optional[int], notification_type: str, title: str, message: str):
    """
    פונקציית עזר ליצירת התראה
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO notifications (user_id, event_id, notification_type, title, message)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, event_id, notification_type, title, message))

        notification_id = cur.fetchone()[0]
        conn.commit()
        return notification_id

    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ========== Endpoints ==========

@router.get("/user/{user_id}")
def get_user_notifications(user_id: int, unread_only: bool = False):
    """
    מחזיר את כל ההתראות של משתמש
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if unread_only:
            cur.execute("""
                SELECT id, user_id, event_id, notification_type, title, message, is_read, created_at
                FROM notifications
                WHERE user_id = %s AND is_read = FALSE
                ORDER BY created_at DESC
            """, (user_id,))
        else:
            cur.execute("""
                SELECT id, user_id, event_id, notification_type, title, message, is_read, created_at
                FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 50
            """, (user_id,))

        rows = cur.fetchall()

        notifications = []
        for row in rows:
            notifications.append({
                "id": row[0],
                "user_id": row[1],
                "event_id": row[2],
                "notification_type": row[3],
                "title": row[4],
                "message": row[5],
                "is_read": row[6],
                "created_at": row[7].isoformat() if row[7] else None
            })

        return notifications

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notifications: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@router.get("/user/{user_id}/unread-count")
def get_unread_count(user_id: int):
    """
    מחזיר את מספר ההתראות שלא נקראו
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*)
            FROM notifications
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))

        count = cur.fetchone()[0]
        return {"unread_count": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unread count: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@router.put("/{notification_id}/mark-read")
def mark_notification_as_read(notification_id: int):
    """
    מסמן התראה כנקראה
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s
            RETURNING id
        """, (notification_id,))

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Notification not found")

        conn.commit()
        return {"success": True, "message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating notification: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@router.put("/user/{user_id}/mark-all-read")
def mark_all_notifications_as_read(user_id: int):
    """
    מסמן את כל ההתראות של משתמש כנקראו
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))

        conn.commit()
        return {"success": True, "message": "All notifications marked as read"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating notifications: {str(e)}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@router.post("/create")
def create_notification_endpoint(notification: NotificationCreate):
    """
    יוצר התראה חדשה
    """
    try:
        notification_id = create_notification(
            notification.user_id,
            notification.event_id,
            notification.notification_type,
            notification.title,
            notification.message
        )
        return {"success": True, "notification_id": notification_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating notification: {str(e)}")
