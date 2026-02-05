from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


# ============================================================================
# DASHBOARD STATISTICS
# ============================================================================

@router.get("/api/admin/dashboard/stats")
async def get_dashboard_stats():
    """
    סטטיסטיקות כלליות לדשבורד מנהל
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # סך כל משתמשים
        cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = FALSE")
        total_users = cursor.fetchone()[0]

        # משתמשים חדשים השבוע
        cursor.execute("""
            SELECT COUNT(*) FROM users
            WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '7 days'
        """)
        new_users_week = cursor.fetchone()[0]

        # סך כל אירועים
        cursor.execute("SELECT COUNT(*) FROM events")
        total_events = cursor.fetchone()[0]

        # אירועים פעילים (status = 'active')
        cursor.execute("SELECT COUNT(*) FROM events WHERE status = 'active'")
        active_events = cursor.fetchone()[0]

        # אירועים חדשים השבוע
        cursor.execute("""
            SELECT COUNT(*) FROM events
            WHERE created_at >= NOW() - INTERVAL '7 days'
        """)
        new_events_week = cursor.fetchone()[0]

        # אירועים שהסתיימו (event_date < today)
        cursor.execute("""
            SELECT COUNT(*) FROM events
            WHERE event_date < CURRENT_DATE AND status = 'active'
        """)
        completed_events = cursor.fetchone()[0]

        # סך כל חבילות שנרכשו
        cursor.execute("SELECT COUNT(*) FROM package_purchases")
        total_packages = cursor.fetchone()[0]

        # חבילות פעילות (status = 'active' or 'used')
        cursor.execute("""
            SELECT COUNT(*) FROM package_purchases
            WHERE status IN ('active', 'used')
        """)
        active_packages = cursor.fetchone()[0]

        # סך כל אורחים
        cursor.execute("SELECT COUNT(*) FROM guests")
        total_guests = cursor.fetchone()[0]

        # אישורי הגעה
        cursor.execute("""
            SELECT COUNT(*) FROM guests
            WHERE attendance_status = 'confirmed'
        """)
        confirmed_guests = cursor.fetchone()[0]

        # סך כל מתנות כספיות
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM gifts")
        total_gifts_amount = cursor.fetchone()[0]

        # מספר מתנות
        cursor.execute("SELECT COUNT(*) FROM gifts")
        total_gifts_count = cursor.fetchone()[0]

        cursor.close()

        return {
            "users": {
                "total": total_users,
                "new_week": new_users_week
            },
            "events": {
                "total": total_events,
                "active": active_events,
                "new_week": new_events_week,
                "completed": completed_events
            },
            "packages": {
                "total": total_packages,
                "active": active_packages
            },
            "guests": {
                "total": total_guests,
                "confirmed": confirmed_guests
            },
            "gifts": {
                "total_amount": float(total_gifts_amount),
                "count": total_gifts_count
            }
        }

    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# USERS MANAGEMENT
# ============================================================================

@router.get("/api/admin/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    """
    קבלת כל המשתמשים עם פילטרים ו-pagination
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause
        where_clause = "WHERE is_admin = FALSE"
        params = []

        if search:
            where_clause += " AND (LOWER(email) LIKE %s OR LOWER(full_name) LIKE %s)"
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern])

        # Count total
        cursor.execute(f"SELECT COUNT(*) FROM users {where_clause}", params)
        total = cursor.fetchone()[0]

        # Get paginated results
        offset = (page - 1) * limit
        valid_sorts = ["created_at", "email", "full_name"]
        sort_column = sort_by if sort_by in valid_sorts else "created_at"
        sort_order = "DESC" if order.lower() == "desc" else "ASC"

        query = f"""
            SELECT
                u.id, u.email, u.full_name, u.created_at, u.email_verified,
                COUNT(DISTINCT pp.id) as total_packages,
                COUNT(DISTINCT e.id) as total_events,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_events,
                COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_events,
                COUNT(DISTINCT CASE WHEN e.status = 'pending' THEN e.id END) as pending_events,
                COUNT(DISTINCT CASE WHEN pp.status = 'active' THEN pp.id END) as active_packages,
                COUNT(DISTINCT CASE WHEN pp.status = 'used' THEN pp.id END) as used_packages,
                MAX(e.created_at) as last_event_date,
                MAX(pp.purchase_date) as last_package_date
            FROM users u
            LEFT JOIN package_purchases pp ON u.id = pp.user_id
            LEFT JOIN events e ON u.id = e.user_id
            {where_clause}
            GROUP BY u.id, u.email, u.full_name, u.created_at, u.email_verified
            ORDER BY {sort_column} {sort_order}
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        users = cursor.fetchall()

        users_list = []
        for user in users:
            users_list.append({
                "id": user[0],
                "email": user[1],
                "full_name": user[2],
                "created_at": user[3].isoformat() if user[3] else None,
                "email_verified": user[4],
                "total_packages": user[5],
                "total_events": user[6],
                "active_events": user[7],
                "completed_events": user[8],
                "pending_events": user[9],
                "active_packages": user[10],
                "used_packages": user[11],
                "last_event_date": user[12].isoformat() if user[12] else None,
                "last_package_date": user[13].isoformat() if user[13] else None
            })

        cursor.close()

        return {
            "users": users_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/admin/users/{user_id}")
async def get_user_details(user_id: int):
    """
    פרטים מלאים על משתמש ספציפי
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # User details
        cursor.execute("""
            SELECT id, email, full_name, created_at, email_verified
            FROM users WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Packages
        cursor.execute("""
            SELECT id, package_name, purchased_at, status
            FROM package_purchases
            WHERE user_id = %s
            ORDER BY purchased_at DESC
        """, (user_id,))
        packages = cursor.fetchall()

        # Events
        cursor.execute("""
            SELECT id, event_type, event_title, event_date, status, created_at
            FROM events
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        events = cursor.fetchall()

        cursor.close()

        return {
            "user": {
                "id": user[0],
                "email": user[1],
                "full_name": user[2],
                "created_at": user[3].isoformat() if user[3] else None,
                "email_verified": user[4]
            },
            "packages": [
                {
                    "id": p[0],
                    "package_name": p[1],
                    "purchased_at": p[2].isoformat() if p[2] else None,
                    "status": p[3]
                } for p in packages
            ],
            "events": [
                {
                    "id": e[0],
                    "event_type": e[1],
                    "event_title": e[2],
                    "event_date": e[3].isoformat() if e[3] else None,
                    "status": e[4],
                    "created_at": e[5].isoformat() if e[5] else None
                } for e in events
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user details: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# EVENTS MANAGEMENT
# ============================================================================

@router.get("/api/admin/events/stats")
async def get_events_stats():
    """
    סטטיסטיקות על אירועים
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Count by status
        cursor.execute("""
            SELECT status, COUNT(*)
            FROM events
            GROUP BY status
        """)
        status_counts = cursor.fetchall()

        stats = {
            "active": 0,
            "completed": 0,
            "pending": 0,
            "cancelled": 0,
            "total": 0
        }

        for status, count in status_counts:
            stats[status] = count
            stats["total"] += count

        # Count by event type
        cursor.execute("""
            SELECT event_type, COUNT(*)
            FROM events
            GROUP BY event_type
            ORDER BY COUNT(*) DESC
        """)
        type_counts = cursor.fetchall()

        cursor.close()

        return {
            "status_breakdown": stats,
            "type_breakdown": [
                {"type": t[0], "count": t[1]} for t in type_counts
            ]
        }

    except Exception as e:
        print(f"Error fetching events stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/admin/events")
async def get_all_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    search: Optional[str] = None
):
    """
    קבלת כל האירועים במערכת
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause
        where_parts = []
        params = []

        if status:
            where_parts.append("e.status = %s")
            params.append(status)

        if event_type:
            where_parts.append("e.event_type = %s")
            params.append(event_type)

        if search:
            where_parts.append("(LOWER(e.event_title) LIKE %s OR LOWER(u.email) LIKE %s)")
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern])

        where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""

        # Count total
        cursor.execute(f"""
            SELECT COUNT(*) FROM events e
            LEFT JOIN users u ON e.user_id = u.id
            {where_clause}
        """, params)
        total = cursor.fetchone()[0]

        # Get paginated results
        offset = (page - 1) * limit

        query = f"""
            SELECT
                e.id, e.event_type, e.event_title, e.event_date, e.event_location,
                e.status, e.created_at, u.email, u.full_name,
                COUNT(DISTINCT g.id) as guest_count
            FROM events e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN guests g ON e.id = g.event_id
            {where_clause}
            GROUP BY e.id, e.event_type, e.event_title, e.event_date,
                     e.event_location, e.status, e.created_at, u.email, u.full_name
            ORDER BY e.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        events = cursor.fetchall()

        events_list = []
        for event in events:
            events_list.append({
                "id": event[0],
                "event_type": event[1],
                "event_title": event[2],
                "event_date": event[3].isoformat() if event[3] else None,
                "event_location": event[4],
                "status": event[5],
                "created_at": event[6].isoformat() if event[6] else None,
                "user_email": event[7],
                "user_name": event[8],
                "guest_count": event[9]
            })

        cursor.close()

        return {
            "events": events_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching events: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# PACKAGES MANAGEMENT
# ============================================================================

@router.get("/api/admin/packages/stats")
async def get_packages_stats():
    """
    סטטיסטיקות על חבילות ומנויים
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Total packages purchased
        cursor.execute("SELECT COUNT(*) FROM package_purchases")
        total_purchases = cursor.fetchone()[0]

        # Active packages
        cursor.execute("SELECT COUNT(*) FROM package_purchases WHERE status = 'active'")
        active_packages = cursor.fetchone()[0]

        # Used packages
        cursor.execute("SELECT COUNT(*) FROM package_purchases WHERE status = 'used'")
        used_packages = cursor.fetchone()[0]

        # Expired packages
        cursor.execute("SELECT COUNT(*) FROM package_purchases WHERE status = 'expired'")
        expired_packages = cursor.fetchone()[0]

        # Packages by type
        cursor.execute("""
            SELECT p.name, p.price, COUNT(pp.id) as purchase_count,
                   COUNT(CASE WHEN pp.status = 'active' THEN 1 END) as active_count
            FROM packages p
            LEFT JOIN package_purchases pp ON p.id = pp.package_id
            GROUP BY p.id, p.name, p.price
            ORDER BY purchase_count DESC
        """)
        package_breakdown = cursor.fetchall()

        cursor.close()

        return {
            "total_purchases": total_purchases,
            "active_packages": active_packages,
            "used_packages": used_packages,
            "expired_packages": expired_packages,
            "package_breakdown": [
                {
                    "name": p[0],
                    "price": float(str(p[1]).replace('₪', '').replace(' ', '').strip()) if p[1] else 0,
                    "total_purchases": p[2],
                    "active_count": p[3]
                } for p in package_breakdown
            ]
        }

    except Exception as e:
        print(f"Error fetching packages stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/admin/packages/purchases")
async def get_package_purchases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    package_name: Optional[str] = None
):
    """
    רשימת כל רכישות החבילות
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause
        where_parts = []
        params = []

        if status:
            where_parts.append("pp.status = %s")
            params.append(status)

        if package_name:
            where_parts.append("p.name = %s")
            params.append(package_name)

        where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""

        # Count total
        cursor.execute(f"""
            SELECT COUNT(*) FROM package_purchases pp
            JOIN packages p ON pp.package_id = p.id
            {where_clause}
        """, params)
        total = cursor.fetchone()[0]

        # Get paginated results
        offset = (page - 1) * limit

        query = f"""
            SELECT
                pp.id, p.name, p.price, pp.purchase_date, pp.expiry_date,
                pp.status, u.email, u.full_name,
                e.event_title
            FROM package_purchases pp
            JOIN packages p ON pp.package_id = p.id
            JOIN users u ON pp.user_id = u.id
            LEFT JOIN events e ON pp.event_id = e.id
            {where_clause}
            ORDER BY pp.purchase_date DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        purchases = cursor.fetchall()

        purchases_list = []
        for purchase in purchases:
            purchases_list.append({
                "id": purchase[0],
                "package_name": purchase[1],
                "price": float(str(purchase[2]).replace('₪', '').replace(' ', '').strip()) if purchase[2] else 0,
                "purchase_date": purchase[3].isoformat() if purchase[3] else None,
                "expiry_date": purchase[4].isoformat() if purchase[4] else None,
                "status": purchase[5],
                "user_email": purchase[6],
                "user_name": purchase[7],
                "event_title": purchase[8]
            })

        cursor.close()

        return {
            "purchases": purchases_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching package purchases: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# FINANCIAL REPORTS
# ============================================================================

@router.get("/api/admin/financial/summary")
async def get_financial_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    דוח כספי מסכם
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build date filter
        date_filter = ""
        params = []

        if start_date and end_date:
            date_filter = "WHERE gift_date BETWEEN %s AND %s"
            params = [start_date, end_date]

        # Total gifts amount
        cursor.execute(f"""
            SELECT
                COALESCE(SUM(amount), 0) as total,
                COUNT(*) as count
            FROM gifts
            {date_filter}
        """, params)
        gifts = cursor.fetchone()

        # Package purchases
        cursor.execute(f"""
            SELECT
                p.name,
                p.price,
                COUNT(pp.id) as purchases,
                SUM(p.price) as revenue
            FROM package_purchases pp
            JOIN packages p ON pp.package_id = p.id
            GROUP BY p.name, p.price
            ORDER BY revenue DESC
        """)
        packages = cursor.fetchall()

        # Monthly breakdown (last 6 months)
        cursor.execute("""
            SELECT
                DATE_TRUNC('month', gift_date) as month,
                SUM(amount) as total
            FROM gifts
            WHERE gift_date >= NOW() - INTERVAL '6 months'
            GROUP BY month
            ORDER BY month DESC
        """)
        monthly = cursor.fetchall()

        cursor.close()

        return {
            "gifts": {
                "total_amount": float(gifts[0]),
                "total_count": gifts[1]
            },
            "packages": [
                {
                    "name": p[0],
                    "price": float(p[1]),
                    "purchases": p[2],
                    "revenue": float(p[3])
                } for p in packages
            ],
            "monthly_breakdown": [
                {
                    "month": m[0].isoformat() if m[0] else None,
                    "amount": float(m[1])
                } for m in monthly
            ]
        }

    except Exception as e:
        print(f"Error fetching financial summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# CONTACT MESSAGES
# ============================================================================

class ContactMessageCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    message: str

@router.post("/api/contact/submit")
async def submit_contact_message(contact: ContactMessageCreate):
    """
    קבלת פנייה חדשה מטופס צור קשר
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO contact_messages (name, email, phone, message, status)
            VALUES (%s, %s, %s, %s, 'new')
            RETURNING id
        """, (contact.full_name, contact.email, contact.phone, contact.message))

        message_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()

        return {
            "success": True,
            "message": "הפנייה נשלחה בהצלחה",
            "id": message_id
        }

    except Exception as e:
        print(f"Error submitting contact message: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/admin/contacts/unread-count")
async def get_unread_contacts_count():
    """
    מחזיר את מספר הפניות שטרם נקראו
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM contact_messages
            WHERE status = 'new'
        """)

        count = cursor.fetchone()[0]
        cursor.close()

        return {"unread_count": count}

    except Exception as e:
        print(f"Error fetching unread contacts count: {e}")
        return {"unread_count": 0}
    finally:
        if conn:
            conn.close()


@router.get("/api/admin/contacts")
async def get_contact_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None
):
    """
    קבלת כל פניות הלקוחות
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'contact_messages'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            return {
                "messages": [],
                "pagination": {"page": 1, "limit": limit, "total": 0, "pages": 0},
                "note": "Contact messages table not created yet"
            }

        # Build WHERE clause
        where_clause = ""
        params = []

        if status:
            where_clause = "WHERE status = %s"
            params.append(status)

        # Count total
        cursor.execute(f"SELECT COUNT(*) FROM contact_messages {where_clause}", params)
        total = cursor.fetchone()[0]

        # Get messages
        offset = (page - 1) * limit
        query = f"""
            SELECT id, name, email, phone, subject, message, status, created_at, responded_at
            FROM contact_messages
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        messages = cursor.fetchall()

        messages_list = []
        for msg in messages:
            messages_list.append({
                "id": msg[0],
                "full_name": msg[1],
                "email": msg[2],
                "phone": msg[3],
                "subject": msg[4],
                "message": msg[5],
                "status": msg[6],
                "created_at": msg[7].isoformat() if msg[7] else None,
                "responded_at": msg[8].isoformat() if msg[8] else None
            })

        cursor.close()

        return {
            "messages": messages_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching contact messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# GUESTS MANAGEMENT
# ============================================================================

@router.get("/api/admin/guests")
async def get_all_guests(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """
    קבלת כל האורחים במערכת
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause
        where_parts = []
        params = []

        if status:
            where_parts.append("g.attendance_status = %s")
            params.append(status)

        if search:
            where_parts.append("(LOWER(g.full_name) LIKE %s OR g.phone LIKE %s)")
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern])

        where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""

        # Count total
        cursor.execute(f"""
            SELECT COUNT(*) FROM guests g
            {where_clause}
        """, params)
        total = cursor.fetchone()[0]

        # Get paginated results
        offset = (page - 1) * limit

        query = f"""
            SELECT
                g.id, g.full_name, g.phone, g.email, g.guests_count,
                g.attendance_status, g.group_name, g.invitation_sent, g.created_at,
                e.event_title
            FROM guests g
            LEFT JOIN events e ON g.event_id = e.id
            {where_clause}
            ORDER BY g.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        guests = cursor.fetchall()

        guests_list = []
        for guest in guests:
            guests_list.append({
                "id": guest[0],
                "full_name": guest[1],
                "phone": guest[2],
                "email": guest[3],
                "guests_count": guest[4],
                "attendance_status": guest[5],
                "group_name": guest[6],
                "invitation_sent": guest[7],
                "created_at": guest[8].isoformat() if guest[8] else None,
                "event_title": guest[9]
            })

        cursor.close()

        return {
            "guests": guests_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching guests: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# GIFTS MANAGEMENT
# ============================================================================

@router.get("/api/admin/gifts")
async def get_all_gifts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None
):
    """
    קבלת כל המתנות במערכת
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause
        where_parts = []
        params = []

        if search:
            where_parts.append("(LOWER(g.full_name) LIKE %s OR LOWER(e.event_title) LIKE %s)")
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern])

        where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""

        # Count total
        cursor.execute(f"""
            SELECT COUNT(*) FROM gifts gf
            LEFT JOIN guests g ON gf.guest_id = g.id
            LEFT JOIN events e ON gf.event_id = e.id
            {where_clause}
        """, params)
        total = cursor.fetchone()[0]

        # Get paginated results
        offset = (page - 1) * limit

        query = f"""
            SELECT
                gf.id, gf.amount, gf.currency, gf.gift_date, gf.payment_method, gf.notes, gf.created_at,
                g.full_name as guest_name,
                e.event_title
            FROM gifts gf
            LEFT JOIN guests g ON gf.guest_id = g.id
            LEFT JOIN events e ON gf.event_id = e.id
            {where_clause}
            ORDER BY gf.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        gifts = cursor.fetchall()

        gifts_list = []
        for gift in gifts:
            gifts_list.append({
                "id": gift[0],
                "amount": float(gift[1]) if gift[1] else 0,
                "currency": gift[2] or "ILS",
                "gift_date": gift[3].isoformat() if gift[3] else None,
                "payment_method": gift[4],
                "notes": gift[5],
                "created_at": gift[6].isoformat() if gift[6] else None,
                "guest_name": gift[7],
                "event_title": gift[8]
            })

        cursor.close()

        return {
            "gifts": gifts_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching gifts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# SCHEDULED MESSAGES
# ============================================================================

@router.get("/api/admin/scheduled-messages")
async def get_scheduled_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    type: Optional[str] = None
):
    """
    קבלת כל ההודעות המתוזמנות במערכת
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if scheduled_messages table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'scheduled_messages'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            return {
                "messages": [],
                "pagination": {"page": 1, "limit": limit, "total": 0, "pages": 0}
            }

        # Build WHERE clause
        where_parts = []
        params = []

        if status:
            where_parts.append("sm.status = %s")
            params.append(status)

        if type:
            where_parts.append("sm.type = %s")
            params.append(type)

        where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""

        # Count total
        cursor.execute(f"""
            SELECT COUNT(*) FROM scheduled_messages sm
            {where_clause}
        """, params)
        total = cursor.fetchone()[0]

        # Get paginated results
        offset = (page - 1) * limit

        query = f"""
            SELECT
                sm.id, sm.type, sm.content, sm.scheduled_at, sm.sent_at, sm.status,
                sm.recipient_name, sm.recipient_phone, sm.recipient_email,
                e.event_title
            FROM scheduled_messages sm
            LEFT JOIN events e ON sm.event_id = e.id
            {where_clause}
            ORDER BY sm.scheduled_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])

        cursor.execute(query, params)
        messages = cursor.fetchall()

        messages_list = []
        for msg in messages:
            messages_list.append({
                "id": msg[0],
                "type": msg[1],
                "content": msg[2],
                "scheduled_at": msg[3].isoformat() if msg[3] else None,
                "sent_at": msg[4].isoformat() if msg[4] else None,
                "status": msg[5],
                "recipient_name": msg[6],
                "recipient_phone": msg[7],
                "recipient_email": msg[8],
                "event_title": msg[9]
            })

        cursor.close()

        return {
            "messages": messages_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print(f"Error fetching scheduled messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# CONTACT MESSAGE UPDATE
# ============================================================================

@router.patch("/api/admin/contacts/{message_id}")
async def update_contact_message(message_id: int, status: str = None):
    """
    עדכון סטטוס של פנייה
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        updates = []
        params = []

        if status:
            updates.append("status = %s")
            params.append(status)
            if status == 'responded':
                updates.append("responded_at = NOW()")

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        params.append(message_id)
        query = f"""
            UPDATE contact_messages
            SET {", ".join(updates)}
            WHERE id = %s
            RETURNING id
        """

        cursor.execute(query, params)
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Message not found")

        conn.commit()
        cursor.close()

        return {"success": True, "message": "Contact updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating contact message: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


# ============================================================================
# RECENT ACTIVITY
# ============================================================================

@router.get("/api/admin/activity/recent")
async def get_recent_activity(limit: int = Query(20, ge=1, le=100)):
    """
    פעילות אחרונה במערכת
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        activities = []

        # Recent users
        cursor.execute("""
            SELECT 'user_registered' as type, email as details, created_at as timestamp
            FROM users
            WHERE is_admin = FALSE
            ORDER BY created_at DESC
            LIMIT 5
        """)
        activities.extend(cursor.fetchall())

        # Recent events
        cursor.execute("""
            SELECT 'event_created' as type, event_title as details, created_at as timestamp
            FROM events
            ORDER BY created_at DESC
            LIMIT 5
        """)
        activities.extend(cursor.fetchall())

        # Recent packages
        cursor.execute("""
            SELECT 'package_purchased' as type, package_name as details, purchased_at as timestamp
            FROM package_purchases
            ORDER BY purchased_at DESC
            LIMIT 5
        """)
        activities.extend(cursor.fetchall())

        # Sort all by timestamp
        activities.sort(key=lambda x: x[2], reverse=True)
        activities = activities[:limit]

        cursor.close()

        return {
            "activities": [
                {
                    "type": a[0],
                    "details": a[1],
                    "timestamp": a[2].isoformat() if a[2] else None
                } for a in activities
            ]
        }

    except Exception as e:
        print(f"Error fetching recent activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
