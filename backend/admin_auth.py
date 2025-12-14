from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import psycopg2
import os
import bcrypt
from datetime import datetime, timedelta
import random
import string
from dotenv import load_dotenv
from email_service import send_admin_verification_code_email
from jose import JWTError, jwt

load_dotenv()

# הגדרות JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

router = APIRouter()

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# מודלים
class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AdminVerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

# פונקציה ליצירת קוד אימות 6 ספרות
def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

# פונקציה ליצירת JWT token
def create_admin_token(admin_id: int, email: str, role: str):
    """יצירת JWT token למנהל"""
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode = {
        "sub": str(admin_id),
        "email": email,
        "role": role,
        "is_admin": True,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# פונקציה לאימות JWT token
async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """אימות JWT token של מנהל"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        admin_id = payload.get("sub")
        email = payload.get("email")
        is_admin = payload.get("is_admin")

        if not admin_id or not email or not is_admin:
            raise HTTPException(status_code=401, detail="Invalid token")

        # בדיקה נוספת מול מסד הנתונים
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, is_active FROM admins
            WHERE id = %s AND LOWER(email) = LOWER(%s)
            """,
            (admin_id, email)
        )
        admin = cursor.fetchone()
        cursor.close()
        conn.close()

        if not admin or not admin[2]:  # admin[2] is is_active
            raise HTTPException(status_code=403, detail="Admin access denied")

        return {
            "admin_id": admin_id,
            "email": email,
            "is_admin": True
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


@router.post("/api/admin/login")
async def admin_login(request: AdminLoginRequest, req: Request):
    """
    התחברות למנהל - שלב 1: אימות פרטים ושליחת קוד למייל
    מטבלת admins בלבד (לא users!)
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # בדיקה בטבלת ADMINS בלבד
        cursor.execute(
            """
            SELECT id, email, password, full_name, role, is_active
            FROM admins
            WHERE LOWER(email) = LOWER(%s)
            """,
            (request.email,)
        )
        admin = cursor.fetchone()

        if not admin:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        admin_id, email, hashed_password, full_name, role, is_active = admin

        # בדיקה שהמנהל פעיל
        if not is_active:
            raise HTTPException(status_code=403, detail="Admin account is disabled")

        # בדיקת סיסמה
        if not bcrypt.checkpw(request.password.encode('utf-8'), hashed_password.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # יצירת קוד אימות חדש
        verification_code = generate_verification_code()
        expiry_time = datetime.now() + timedelta(minutes=15)

        # שמירת הקוד במסד הנתונים
        cursor.execute(
            """
            UPDATE admins
            SET admin_verification_code = %s,
                admin_verification_expires = %s
            WHERE id = %s
            """,
            (verification_code, expiry_time, admin_id)
        )
        conn.commit()

        # שליחת קוד למייל
        try:
            send_admin_verification_code_email(email, full_name or "Admin", verification_code)
        except Exception as e:
            print(f"Error sending verification email: {e}")
            raise HTTPException(status_code=500, detail="Failed to send verification code")

        cursor.close()
        return {
            "message": "Verification code sent to your email",
            "email": email,
            "requires_verification": True
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        if conn:
            conn.close()


@router.post("/api/admin/verify-code")
async def admin_verify_code(request: AdminVerifyCodeRequest):
    """
    התחברות למנהל - שלב 2: אימות קוד והתחברות
    מטבלת admins בלבד
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # בדיקת קוד האימות בטבלת ADMINS
        cursor.execute(
            """
            SELECT id, email, full_name, role, admin_verification_code, admin_verification_expires
            FROM admins
            WHERE LOWER(email) = LOWER(%s)
            """,
            (request.email,)
        )
        admin = cursor.fetchone()

        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")

        admin_id, email, full_name, role, stored_code, code_expires = admin

        # בדיקת קוד
        if not stored_code or stored_code != request.code:
            raise HTTPException(status_code=400, detail="Invalid verification code")

        # בדיקת תוקף הקוד
        if not code_expires or datetime.now() > code_expires:
            raise HTTPException(status_code=400, detail="Verification code has expired")

        # מחיקת הקוד ועדכון last_login
        cursor.execute(
            """
            UPDATE admins
            SET admin_verification_code = NULL,
                admin_verification_expires = NULL,
                last_login = NOW()
            WHERE id = %s
            """,
            (admin_id,)
        )
        conn.commit()

        cursor.close()

        # יצירת JWT token
        access_token = create_admin_token(admin_id, email, role)

        # החזרת פרטי המנהל + token
        return {
            "message": "Admin login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": admin_id,
                "email": email,
                "full_name": full_name,
                "role": role,
                "is_admin": True
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        if conn:
            conn.close()


@router.get("/api/admin/check-session")
async def check_admin_session(admin_data: dict = Depends(verify_admin_token)):
    """
    בדיקת סטטוס מנהל - מטבלת admins בלבד (דורש JWT token)
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, email, full_name, role, is_active
            FROM admins
            WHERE id = %s
            """,
            (admin_data['admin_id'],)
        )
        admin = cursor.fetchone()

        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")

        admin_id, email, full_name, role, is_active = admin

        if not is_active:
            raise HTTPException(status_code=403, detail="Admin account is disabled")

        cursor.close()

        return {
            "is_admin": True,
            "user": {
                "id": admin_id,
                "email": email,
                "full_name": full_name,
                "role": role
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Session check error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        if conn:
            conn.close()
