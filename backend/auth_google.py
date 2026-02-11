from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import requests
from urllib.parse import urlencode
import psycopg2
from datetime import datetime

from db import get_db_connection
from auth import hash_password
from email_service import send_welcome_email

load_dotenv()

router = APIRouter(
    prefix="/api/auth/google",
    tags=["google-auth"]
)

# Google OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def get_google_config():
    """טוען את הגדרות Google OAuth מ-.env בכל קריאה"""
    load_dotenv()  # טוען מחדש את המשתנים
    return {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/login-success")
    }


class GoogleTokenRequest(BaseModel):
    code: str


@router.get("/login")
def google_login():
    """
    נקודת התחלה להתחברות דרך Google
    מפנה את המשתמש לעמוד ההרשאה של Google
    """
    config = get_google_config()

    if not config["client_id"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured"
        )

    # פרמטרים לבקשת ההרשאה של Google
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }

    # בניית URL עם הפרמטרים
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    return {"url": auth_url}


@router.get("/callback")
def google_callback_get(code: str):
    """
    Callback endpoint GET שמקבל את הקוד מ-Google ב-query parameter
    ומפנה את המשתמש ל-Frontend עם הפרטים
    """
    from fastapi import Query
    from urllib.parse import urlencode

    # קורא לפונקציה שמטפלת בהתחברות
    result = google_callback_post(GoogleTokenRequest(code=code))

    # בונה URL להפניה ל-Frontend עם פרטי המשתמש
    frontend_url = os.getenv("FRONTEND_URL", "https://savedayevents.com")
    params = {
        "userId": result["id"],
        "email": result["email"],
        "fullName": result["full_name"],
        "isNewUser": str(result["is_new_user"]).lower()
    }

    redirect_url = f"{frontend_url}/login-success?{urlencode(params)}"
    return RedirectResponse(url=redirect_url)


@router.post("/callback")
def google_callback_post(token_request: GoogleTokenRequest):
    """
    Callback endpoint שמקבל את הקוד מ-Google ומחליף אותו ב-access token
    לאחר מכן מושך את פרטי המשתמש ויוצר/מתחבר למשתמש במערכת
    """
    conn = None
    cur = None

    try:
        config = get_google_config()

        # החלפת הקוד ב-access token
        token_data = {
            "code": token_request.code,
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "redirect_uri": config["redirect_uri"],
            "grant_type": "authorization_code"
        }

        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)

        if token_response.status_code != 200:
            error_detail = token_response.json() if token_response.text else {}
            print(f"Google token error: {token_response.status_code}, {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to get access token from Google: {error_detail.get('error_description', error_detail)}"
            )

        token_json = token_response.json()
        access_token = token_json.get("access_token")

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received from Google"
            )

        # משיכת פרטי המשתמש מ-Google
        userinfo_response = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )

        userinfo = userinfo_response.json()
        email = userinfo.get("email")
        full_name = userinfo.get("name")
        google_id = userinfo.get("id")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email received from Google"
            )

        # חיבור לבסיס הנתונים
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקה אם המשתמש כבר קיים (לפי אימייל)
        cur.execute(
            """
            SELECT id, email, full_name, created_at
            FROM users
            WHERE email = %s;
            """,
            (email,)
        )

        user_record = cur.fetchone()

        if user_record:
            # המשתמש כבר קיים - התחברות
            user_id, user_email, user_full_name, created_at = user_record

            return {
                "id": user_id,
                "email": user_email,
                "full_name": user_full_name,
                "created_at": created_at.isoformat() if created_at else None,
                "is_new_user": False
            }
        else:
            # המשתמש לא קיים - יצירת משתמש חדש
            # ליצור סיסמה רנדומלית (לא תשמש כי המשתמש מתחבר דרך Google)
            random_password = hash_password(f"google_{google_id}_{os.urandom(16).hex()}")

            cur.execute(
                """
                INSERT INTO users (email, password, full_name, email_verified)
                VALUES (%s, %s, %s, TRUE)
                RETURNING id, created_at;
                """,
                (email, random_password, full_name)
            )

            new_user = cur.fetchone()
            user_id, created_at = new_user
            conn.commit()

            # שליחת מייל ברוכים הבאים למשתמש חדש
            try:
                send_welcome_email(email, full_name)
            except Exception as email_error:
                # אם שליחת המייל נכשלה, נמשיך בכל זאת - ההרשמה הצליחה
                print(f"Failed to send welcome email: {email_error}")

            return {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "created_at": created_at.isoformat() if created_at else None,
                "is_new_user": True
            }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except requests.RequestException as e:
        if conn:
            conn.rollback()
        print(f"Google OAuth request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to communicate with Google OAuth service"
        )
    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
