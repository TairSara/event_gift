from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import get_db_connection
from auth import router as auth_router
from auth_google import router as auth_google_router
from packages import router as packages_router
from notifications import router as notifications_router
from admin_auth import router as admin_auth_router
from admin_api import router as admin_api_router
from whatsapp_api import router as whatsapp_router
from invitation_image_upload import router as invitation_router
from sms_router import router as sms_router
from rsvp_router import router as rsvp_router
from payment_routes import router as payment_router
from scheduler_router import router as scheduler_router

app = FastAPI(title="giftWeb-api")

# Run database migrations on startup
@app.on_event("startup")
async def startup_migrations():
    """Ensure database schema is up to date"""
    try:
        from ensure_guest_columns import ensure_columns
        ensure_columns()
    except Exception as e:
        print(f"⚠️ Migration warning (guests): {str(e)}")

    try:
        from add_bit_link_column import add_bit_link_column
        add_bit_link_column()
    except Exception as e:
        print(f"⚠️ Migration warning (bit_link): {str(e)}")

    try:
        from add_message_schedule_columns import run_migrations as run_scheduler_migrations
        run_scheduler_migrations()
    except Exception as e:
        print(f"⚠️ Migration warning (scheduler): {str(e)}")

    try:
        from add_message_settings_column import add_message_settings_column
        add_message_settings_column()
    except Exception as e:
        print(f"⚠️ Migration warning (message_settings): {str(e)}")

# CORS Configuration - נאפשר לפרונט לגשת ל-API
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://event-gift-fronten.onrender.com",  # כתובת הפרונט הישנה ב-Render
    "https://event-gift-frontend.onrender.com",  # כתובת הפרונט ב-Render
    "https://savedayevents.com",  # דומיין חדש
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "giftWeb API is running", "version": "1.0", "docs": "/docs", "health": "/api/health"}

@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/db-test")
def db_test():
    """
    ראוט לבדיקה שהחיבור ל-Postgres עובד
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.fetchone()
        cur.close()
        conn.close()
        return {"db_ok": True}
    except Exception as e:
        return {"db_ok": False, "error": str(e)}


# חיבור ראוט ההרשמה / התחברות
app.include_router(auth_router)

# חיבור ראוט Google OAuth
app.include_router(auth_google_router)

# חיבור ראוט חבילות ואירועים
app.include_router(packages_router)

# חיבור ראוט התראות
app.include_router(notifications_router)

# חיבור ראוט אימות מנהל
app.include_router(admin_auth_router)

# חיבור ראוט Admin API
app.include_router(admin_api_router)

# חיבור ראוט WhatsApp Interactive Messages
app.include_router(whatsapp_router)

# חיבור ראוט Invitation Image Upload
app.include_router(invitation_router)

# חיבור ראוט SMS (019SMS)
app.include_router(sms_router)

# חיבור ראוט RSVP (אישור הגעה)
app.include_router(rsvp_router)

# חיבור ראוט Payments (תשלומים דרך טרנזילה)
app.include_router(payment_router)

# חיבור ראוט Scheduler (תזמון הודעות אוטומטי)
app.include_router(scheduler_router)
