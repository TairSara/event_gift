"""
Scheduler API Router

Endpoints:
1. POST /api/scheduler/process - Process all scheduled messages (for cron job)
2. POST /api/scheduler/create-schedules/{event_id} - Create schedules for an event
3. GET /api/scheduler/event/{event_id} - Get scheduled messages for an event
4. GET /api/scheduler/pending - Get all pending scheduled messages
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import os
import json

from scheduler_service import (
    create_scheduled_messages_for_event,
    process_all_scheduled_messages,
    get_messages_to_send_today,
    update_event_schedules_on_date_change
)
from db import get_db_connection

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])

# Secret key for cron job authentication (set in environment)
CRON_SECRET = os.getenv('CRON_SECRET', 'your-secret-key-change-in-production')


class CreateScheduleRequest(BaseModel):
    event_date: str  # ISO format date
    message_schedule: Optional[dict] = None


@router.post("/process")
async def process_scheduled_messages(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret")
):
    """
    Process all pending scheduled messages for today.

    This endpoint should be called by an external cron service (like cron-job.org)
    once per day (recommended: early morning, e.g., 08:00 Israel time).

    Requires X-Cron-Secret header for authentication.
    """
    # Verify cron secret
    if x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Invalid cron secret")

    try:
        result = process_all_scheduled_messages()
        return result
    except Exception as e:
        print(f"Error processing scheduled messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-test")
async def process_scheduled_messages_test():
    """
    Test endpoint to manually trigger message processing.
    FOR DEVELOPMENT/TESTING ONLY - remove or protect in production.
    """
    try:
        result = process_all_scheduled_messages()
        return result
    except Exception as e:
        print(f"Error processing scheduled messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-schedules/{event_id}")
async def create_schedules_for_event(event_id: int, request: CreateScheduleRequest):
    """
    Create scheduled messages for an event.
    Called when event date is set/updated.
    """
    try:
        event_date = datetime.fromisoformat(request.event_date).date()
        message_schedule = request.message_schedule or {
            "schedule_type": "default",
            "days_before": [21, 14, 7]
        }

        result = create_scheduled_messages_for_event(event_id, event_date, message_schedule)

        return {
            "success": True,
            "event_id": event_id,
            "created_schedules": result
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        print(f"Error creating schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update-schedules/{event_id}")
async def update_schedules_for_event(event_id: int, request: CreateScheduleRequest):
    """
    Update scheduled messages when event date changes.
    Deletes pending messages and creates new ones.
    """
    try:
        event_date = datetime.fromisoformat(request.event_date).date()
        message_schedule = request.message_schedule or {
            "schedule_type": "default",
            "days_before": [21, 14, 7]
        }

        result = update_event_schedules_on_date_change(event_id, event_date, message_schedule)

        return {
            "success": True,
            "event_id": event_id,
            "deleted": result['deleted'],
            "created": result['created']
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        print(f"Error updating schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/event/{event_id}")
async def get_event_schedules(event_id: int):
    """Get all scheduled messages for an event"""
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                id, message_number, scheduled_date, status,
                sent_at, guests_sent_count, guests_failed_count, error_message
            FROM scheduled_messages
            WHERE event_id = %s
            ORDER BY message_number;
        """, (event_id,))

        schedules = []
        for row in cur.fetchall():
            schedules.append({
                'id': row[0],
                'message_number': row[1],
                'scheduled_date': row[2].isoformat() if row[2] else None,
                'status': row[3],
                'sent_at': row[4].isoformat() if row[4] else None,
                'guests_sent_count': row[5],
                'guests_failed_count': row[6],
                'error_message': row[7]
            })

        return {
            "event_id": event_id,
            "schedules": schedules
        }

    except Exception as e:
        print(f"Error getting event schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/pending")
async def get_pending_schedules():
    """Get all pending scheduled messages"""
    try:
        messages = get_messages_to_send_today()
        return {
            "count": len(messages),
            "messages": messages
        }
    except Exception as e:
        print(f"Error getting pending schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def scheduler_health():
    """Health check for scheduler service"""
    return {
        "status": "healthy",
        "service": "scheduler",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/run-migrations")
async def run_scheduler_migrations():
    """Manually run scheduler migrations to create tables"""
    try:
        from add_message_schedule_columns import run_migrations
        run_migrations()
        return {
            "success": True,
            "message": "Migrations completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
