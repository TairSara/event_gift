from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import get_db_connection
from auth import router as auth_router
from auth_google import router as auth_google_router
from packages import router as packages_router
from notifications import router as notifications_router
from admin_auth import router as admin_auth_router
from admin_api import router as admin_api_router
from invitations_api import router as invitations_router
from message_scheduler import start_scheduler

app = FastAPI(title="giftWeb-api")

# התחלת שירות תזמון הודעות
start_scheduler()

# CORS Configuration - נאפשר לפרונט לגשת ל-API
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://event-gift-fronten.onrender.com",  # כתובת הפרונט ב-Render
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# חיבור ראוט שליחת הזמנות
app.include_router(invitations_router)
