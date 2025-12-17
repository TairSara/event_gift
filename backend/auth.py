from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from datetime import datetime, timedelta
import random
import string

import psycopg2
import bcrypt

from db import get_db_connection  # מייבאים את החיבור מהקובץ החדש
from email_service import send_welcome_email, send_reset_code_email, send_password_reset_success_email, send_verification_code_email
from security_email import send_security_alert_email

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)

# הצפנת סיסמאות
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# הגדרות אבטחה
MAX_FAILED_ATTEMPTS = 5  # מספר ניסיונות כושלים מקסימלי
LOCKOUT_DURATION_MINUTES = 15  # זמן נעילה בדקות
FAILED_ATTEMPTS_WINDOW_MINUTES = 30  # חלון זמן לספירת ניסיונות

def record_failed_login(email: str, ip_address: str = None, user_agent: str = None):
    """
    רושם ניסיון התחברות כושל
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO failed_login_attempts (email, ip_address, user_agent)
            VALUES (%s, %s, %s)
        """, (email, ip_address, user_agent))

        conn.commit()
    except Exception as e:
        print(f"Error recording failed login: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def get_recent_failed_attempts(email: str) -> int:
    """
    מחזיר את מספר הניסיונות הכושלים ב-X דקות האחרונות
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        time_threshold = datetime.now() - timedelta(minutes=FAILED_ATTEMPTS_WINDOW_MINUTES)

        cur.execute("""
            SELECT COUNT(*)
            FROM failed_login_attempts
            WHERE email = %s AND attempt_time > %s
        """, (email, time_threshold))

        count = cur.fetchone()[0]
        return count
    except Exception as e:
        print(f"Error getting failed attempts: {e}")
        return 0
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def check_account_lock(email: str) -> tuple:
    """
    בודק אם החשבון נעול
    מחזיר: (is_locked: bool, locked_until: datetime or None)
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT locked_until
            FROM account_locks
            WHERE email = %s AND locked_until > NOW()
        """, (email,))

        result = cur.fetchone()
        if result:
            return (True, result[0])
        return (False, None)
    except Exception as e:
        print(f"Error checking account lock: {e}")
        return (False, None)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def lock_account(email: str, full_name: str, ip_address: str = None):
    """
    נועל חשבון לזמן מוגדר ושולח מייל התראה
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        locked_until = datetime.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)

        # נסה לעדכן אם קיים, אחרת צור חדש
        cur.execute("""
            INSERT INTO account_locks (email, locked_until, lock_reason)
            VALUES (%s, %s, %s)
            ON CONFLICT (email)
            DO UPDATE SET
                locked_until = EXCLUDED.locked_until,
                lock_reason = EXCLUDED.lock_reason,
                created_at = NOW()
        """, (email, locked_until, f"חריגת מספר ניסיונות התחברות כושלים ({MAX_FAILED_ATTEMPTS})"))

        conn.commit()

        # שליחת מייל התראה
        send_security_alert_email(email, full_name or email, locked_until, ip_address)

        return locked_until
    except Exception as e:
        print(f"Error locking account: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def clear_failed_attempts(email: str):
    """
    מנקה את הניסיונות הכושלים לאחר התחברות מוצלחת
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            DELETE FROM failed_login_attempts
            WHERE email = %s
        """, (email,))

        # גם מסיר נעילה אם קיימת
        cur.execute("""
            DELETE FROM account_locks
            WHERE email = %s
        """, (email,))

        conn.commit()
    except Exception as e:
        print(f"Error clearing failed attempts: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# מודל נתוני הרשמה
class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = None

# מודל נתוני התחברות
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# מודל בקשת איפוס סיסמה
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# מודל אימות קוד בלבד
class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str

# מודל איפוס סיסמה (אחרי אימות הקוד)
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: constr(min_length=8)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate):
    """
    רישום משתמש חדש:
    - אימייל תקין
    - סיסמה לפחות 8 תווים
    - סיסמה נשמרת מוצפנת (bcrypt)
    - חוסם מיילים של admins
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקה שהמייל לא שייך למנהל
        cur.execute(
            "SELECT id FROM admins WHERE LOWER(email) = LOWER(%s)",
            (user.email,)
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail="This email is reserved for administrative use"
            )

        hashed_pw = hash_password(user.password)

        # ניסיון להכניס עם phone, אם נכשל - ננסה בלי
        try:
            cur.execute(
                """
                INSERT INTO users (email, password, full_name, phone)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """,
                (user.email, hashed_pw, user.full_name, user.phone)
            )
        except psycopg2.errors.UndefinedColumn:
            # אם עמודת phone לא קיימת, ננסה בלי
            if conn:
                conn.rollback()
            cur.execute(
                """
                INSERT INTO users (email, password, full_name)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (user.email, hashed_pw, user.full_name)
            )

        new_id = cur.fetchone()[0]

        # יצירת קוד אימות בן 6 ספרות
        verification_code = ''.join(random.choices(string.digits, k=6))

        print(f"=== VERIFICATION CODE FOR {user.email}: {verification_code} ===")

        # תוקף הקוד: 15 דקות מעכשיו
        expires_at = datetime.now() + timedelta(minutes=15)

        # שמירת הקוד בבסיס הנתונים
        cur.execute(
            """
            UPDATE users
            SET verification_token = %s, verification_token_expires = %s
            WHERE id = %s;
            """,
            (verification_code, expires_at, new_id)
        )
        conn.commit()

        # שליחת מייל עם קוד האימות
        try:
            send_verification_code_email(user.email, verification_code)
        except Exception as email_error:
            # אם שליחת המייל נכשלה, נמשיך בכל זאת - ההרשמה הצליחה
            print(f"Failed to send verification email: {email_error}")

        return {
            "id": new_id,
            "email": user.email,
            "full_name": user.full_name
        }

    except psycopg2.errors.UniqueViolation:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="האימייל כבר קיים במערכת"
        )
    except Exception:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/login")
def login(user: UserLogin):
    """
    התחברות משתמש:
    - בודק שהאימייל קיים במערכת
    - מאמת את הסיסמה
    - מגן מפני ניסיונות התחברות כושלים מרובים
    - מחזיר את פרטי המשתמש
    """
    conn = None
    cur = None

    try:
        # בדיקה אם החשבון נעול
        is_locked, locked_until = check_account_lock(user.email)
        if is_locked:
            minutes_left = int((locked_until - datetime.now()).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"החשבון ננעל זמנית עקב ניסיונות התחברות כושלים מרובים. נסה שוב בעוד {minutes_left} דקות"
            )

        conn = get_db_connection()
        cur = conn.cursor()

        # חיפוש המשתמש לפי אימייל
        cur.execute(
            """
            SELECT id, email, password, full_name, created_at, email_verified
            FROM users
            WHERE email = %s;
            """,
            (user.email,)
        )

        user_record = cur.fetchone()

        # אם המשתמש לא נמצא - רשום ניסיון כושל
        if not user_record:
            record_failed_login(user.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="אימייל או סיסמה שגויים"
            )

        user_id, email, hashed_password, full_name, created_at, email_verified = user_record

        # בדיקת הסיסמה
        if not verify_password(user.password, hashed_password):
            # רישום ניסיון כושל
            record_failed_login(user.email)

            # בדיקה אם עברנו את מספר הניסיונות המקסימלי
            failed_attempts = get_recent_failed_attempts(user.email)

            if failed_attempts >= MAX_FAILED_ATTEMPTS:
                # נעילת החשבון
                locked_until = lock_account(user.email, full_name)
                if locked_until:
                    minutes_left = LOCKOUT_DURATION_MINUTES
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"חשבונך ננעל ל-{minutes_left} דקות עקב {MAX_FAILED_ATTEMPTS} ניסיונות כושלים. נשלח מייל עם פרטים נוספים"
                    )

            # מציג כמה ניסיונות נותרו
            remaining_attempts = MAX_FAILED_ATTEMPTS - failed_attempts
            if remaining_attempts <= 2:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"אימייל או סיסמה שגויים. נותרו {remaining_attempts} ניסיונות לפני נעילת החשבון"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="אימייל או סיסמה שגויים"
                )

        # בדיקה אם המייל אומת
        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="יש לאמת את כתובת המייל לפני ההתחברות"
            )

        # התחברות מוצלחת - ניקוי ניסיונות כושלים
        clear_failed_attempts(user.email)

        # מחזירים את פרטי המשתמש
        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "created_at": created_at.isoformat() if created_at else None
        }

    except HTTPException:
        # מעביר הלאה את שגיאות ה-HTTP שכבר זרקנו
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    """
    שולח קוד איפוס סיסמה למייל המשתמש
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקה אם המשתמש קיים
        cur.execute(
            "SELECT id FROM users WHERE email = %s;",
            (request.email,)
        )
        user = cur.fetchone()

        if not user:
            # לא חושפים שהמשתמש לא קיים מסיבות אבטחה
            return {"message": "אם המייל קיים במערכת, נשלח קוד אימות"}

        # יצירת קוד אימות בן 6 ספרות
        reset_code = ''.join(random.choices(string.digits, k=6))

        # תוקף הקוד: 15 דקות מעכשיו
        expires_at = datetime.now() + timedelta(minutes=15)

        # שמירת הקוד בבסיס הנתונים
        cur.execute(
            """
            UPDATE users
            SET reset_token = %s, reset_token_expires = %s
            WHERE email = %s;
            """,
            (reset_code, expires_at, request.email)
        )
        conn.commit()

        # שליחת מייל עם קוד האיפוס
        email_sent = False
        try:
            email_sent = send_reset_code_email(request.email, reset_code)
            if not email_sent:
                print(f"WARNING: Email sending returned False for {request.email}")
        except Exception as email_error:
            print(f"ERROR: Failed to send reset code email: {email_error}")
            import traceback
            traceback.print_exc()

        # מחזיר הודעה כללית (גם אם המייל נכשל - הקוד נשמר בDB)
        # הקוד נשמר תמיד, כך שהמשתמש יוכל להשתמש בו אם יש לו גישה ל-DB או לוגים
        print(f"=== Reset code for {request.email}: {reset_code} (Email sent: {email_sent}) ===")

        if email_sent:
            return {"message": "קוד איפוס נשלח למייל שלך"}
        else:
            # במצב של שגיאה, עדיין נחזיר הודעה כללית
            # אבל נרשום שגיאה בלוגים
            return {"message": "קוד איפוס נשלח למייל שלך"}

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/verify-reset-code")
def verify_reset_code(request: VerifyResetCodeRequest):
    """
    אימות קוד איפוס סיסמה (שלב 1 - לפני הכנסת סיסמה חדשה)
    מחזיר הצלחה אם הקוד תקין ותקף
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print(f"🔍 DEBUG: Verifying code for email: {request.email}")
        print(f"🔍 DEBUG: Received code: {request.code}")

        # חיפוש המשתמש לפי אימייל
        cur.execute(
            """
            SELECT id, reset_token, reset_token_expires, full_name
            FROM users
            WHERE email = %s;
            """,
            (request.email,)
        )
        user_record = cur.fetchone()

        if not user_record:
            print(f"❌ DEBUG: User not found for email: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="פרטים שגויים"
            )

        user_id, reset_token, reset_token_expires, full_name = user_record

        print(f"🔍 DEBUG: DB reset_token: {reset_token}")
        print(f"🔍 DEBUG: DB reset_token_expires: {reset_token_expires}")
        print(f"🔍 DEBUG: Codes match: {reset_token == request.code}")

        # בדיקה אם הקוד תקין
        if not reset_token or reset_token != request.code:
            print(f"❌ DEBUG: Code mismatch! DB: '{reset_token}' vs Received: '{request.code}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="קוד אימות שגוי"
            )

        # בדיקה אם הקוד לא פג תוקף
        if datetime.now() > reset_token_expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="קוד האימות פג תוקף, בקש קוד חדש"
            )

        # הקוד תקין!
        return {
            "message": "קוד אומת בהצלחה",
            "valid": True,
            "email": request.email
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Verify reset code error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    """
    מאפס את הסיסמה באמצעות קוד אימות
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # חיפוש המשתמש לפי אימייל וקוד
        cur.execute(
            """
            SELECT id, reset_token, reset_token_expires
            FROM users
            WHERE email = %s;
            """,
            (request.email,)
        )
        user_record = cur.fetchone()

        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="פרטים שגויים"
            )

        user_id, reset_token, reset_token_expires = user_record

        # בדיקה אם הקוד תקין
        if not reset_token or reset_token != request.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="קוד אימות שגוי"
            )

        # בדיקה אם הקוד לא פג תוקף
        if datetime.now() > reset_token_expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="קוד האימות פג תוקף, בקש קוד חדש"
            )

        # הצפנת הסיסמה החדשה
        new_hashed_password = hash_password(request.new_password)

        # עדכון הסיסמה, מחיקת הקוד ואימות המייל (כי הוא קיבל את הקוד במייל)
        cur.execute(
            """
            UPDATE users
            SET password = %s, reset_token = NULL, reset_token_expires = NULL, email_verified = TRUE
            WHERE id = %s
            RETURNING full_name;
            """,
            (new_hashed_password, user_id)
        )
        full_name = cur.fetchone()[0]
        conn.commit()

        # שליחת מייל אישור על איפוס מוצלח
        try:
            send_password_reset_success_email(request.email, full_name)
        except Exception as email_error:
            # אם שליחת המייל נכשלה, נמשיך בכל זאת - איפוס הסיסמה הצליח
            print(f"Failed to send password reset success email: {email_error}")

        return {"message": "הסיסמה אופסה בהצלחה"}

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# מודל אימות קוד מייל
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


@router.post("/verify-email")
def verify_email(request: VerifyEmailRequest):
    """
    אימות קוד שנשלח למייל לאימות כתובת האימייל
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print(f"DEBUG: Verifying email for: {request.email}")
        print(f"DEBUG: Received code: {request.code}")

        # חיפוש המשתמש לפי אימייל
        cur.execute(
            """
            SELECT id, verification_token, verification_token_expires, email_verified
            FROM users
            WHERE email = %s;
            """,
            (request.email,)
        )
        user_record = cur.fetchone()

        if not user_record:
            print(f"DEBUG: User not found for email: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="פרטים שגויים"
            )

        user_id, verification_token, verification_token_expires, email_verified = user_record

        print(f"DEBUG: DB verification_token: {verification_token}")
        print(f"DEBUG: DB expires: {verification_token_expires}")
        print(f"DEBUG: Already verified: {email_verified}")

        # בדיקה אם המייל כבר אומת
        if email_verified:
            return {
                "message": "המייל כבר אומת",
                "valid": True,
                "email": request.email
            }

        # בדיקה אם הקוד תקין
        if not verification_token or verification_token != request.code:
            print(f"DEBUG: Code mismatch! DB: '{verification_token}' vs Received: '{request.code}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="קוד אימות שגוי"
            )

        # בדיקה אם הקוד לא פג תוקף
        if datetime.now() > verification_token_expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="קוד האימות פג תוקף, בקש קוד חדש"
            )

        # הקוד תקין! סמן את המייל כמאומת
        cur.execute(
            """
            UPDATE users
            SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL
            WHERE id = %s
            RETURNING full_name;
            """,
            (user_id,)
        )
        full_name = cur.fetchone()[0]
        conn.commit()

        # שליחת מייל ברוך הבא אחרי אימות מוצלח
        try:
            send_welcome_email(request.email, full_name)
        except Exception as email_error:
            print(f"Failed to send welcome email: {email_error}")

        print(f"DEBUG: Email verified successfully for: {request.email}")

        return {
            "message": "המייל אומת בהצלחה",
            "valid": True,
            "email": request.email
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Verify email error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.post("/resend-verification-code")
def resend_verification_code(request: ForgotPasswordRequest):
    """
    שליחה חוזרת של קוד אימות למייל
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # בדיקה אם המשתמש קיים
        cur.execute(
            "SELECT id, email_verified FROM users WHERE email = %s;",
            (request.email,)
        )
        user = cur.fetchone()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="משתמש לא נמצא"
            )

        user_id, email_verified = user

        # בדיקה אם המייל כבר אומת
        if email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="המייל כבר אומת"
            )

        # יצירת קוד אימות חדש בן 6 ספרות
        verification_code = ''.join(random.choices(string.digits, k=6))

        # תוקף הקוד: 15 דקות מעכשיו
        expires_at = datetime.now() + timedelta(minutes=15)

        # עדכון הקוד בבסיס הנתונים
        cur.execute(
            """
            UPDATE users
            SET verification_token = %s, verification_token_expires = %s
            WHERE email = %s;
            """,
            (verification_code, expires_at, request.email)
        )
        conn.commit()

        # שליחת מייל עם קוד האימות
        try:
            send_verification_code_email(request.email, verification_code)
        except Exception as email_error:
            print(f"Failed to send verification email: {email_error}")

        return {"message": "קוד אימות חדש נשלח למייל שלך"}

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Resend verification code error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשרת, נסי שוב מאוחר יותר"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
