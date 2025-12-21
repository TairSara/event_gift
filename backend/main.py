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
from sms_webhook import router as sms_webhook_router

app = FastAPI(title="giftWeb-api")

# Run database migrations on startup
@app.on_event("startup")
async def startup_migrations():
    """Run database migrations on application startup"""
    try:
        print("🔧 Running database migrations...")
        from add_guest_status_columns import add_status_columns
        add_status_columns()
        print("✅ Database migrations completed")
    except Exception as e:
        print(f"⚠️ Migration warning: {str(e)}")
        # Don't crash the app if migration fails (columns might already exist)

# CORS Configuration - נאפשר לפרונט לגשת ל-API
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://event-gift-fronten.onrender.com",  # כתובת הפרונט הישנה ב-Render
    "https://event-gift-frontend.onrender.com",  # כתובת הפרונט החדשה ב-Render
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

# חיבור ראוט SMS Webhook (קבלת תשובות SMS)
app.include_router(sms_webhook_router)
