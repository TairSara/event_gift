"""
Routes לניהול תשלומים דרך טרנזילה
"""
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import json
import uuid
import os

from db import get_db_connection
from tranzila_integration import tranzila

# הגדרת מחירי חבילות - מכיוון שאין טבלת מחירים ב-DB
PACKAGES_PRICING = {
    1: {"name": "חבילת בסיס – ידני", "price": 39},  # מחיר קבוע
    2: {  # SMS - לפי כמות רשומות
        "name": "אוטומטי SMS",
        "prices": {
            "150 רשומות": 59,
            "300 רשומות": 79,
            "500 רשומות": 109,
            "800 רשומות": 159,
            "1,000 רשומות": 189,
            "2,000 רשומות": 319
        }
    },
    3: {  # WhatsApp - לפי כמות
        "name": "אוטומטי WhatsApp",
        "prices": {
            "עד 50": 69,
            "עד 100": 109,
            "עד 150": 169,
            "עד 200": 229,
            "עד 300": 329,
            "עד 400": 419,
            "עד 500": 509,
            "עד 600": 589,
            "עד 700": 649,
            "עד 800": 709
        }
    },
    4: {  # ראש שקט
        "name": "אוטומטי \"ראש שקט\"",
        "prices": {
            "עד 100": 239,
            "עד 200": 469,
            "עד 300": 679,
            "עד 400": 869,
            "עד 500": 1039,
            "עד 600": 1189,
            "עד 700": 1389,
            "עד 800": 1589
        }
    },
    5: {  # ראש שקט פלוס
        "name": "אוטומטי \"ראש שקט פלוס\"",
        "prices": {
            "עד 100": 339,
            "עד 200": 569,
            "עד 300": 779,
            "עד 400": 969,
            "עד 500": 1139,
            "עד 600": 1289,
            "עד 700": 1489,
            "עד 800": 1689
        }
    }
}

router = APIRouter(
    prefix="/api/payments",
    tags=["payments"]
)

# ========== Models ==========

class PaymentInitRequest(BaseModel):
    """בקשה ליצירת תשלום"""
    user_id: int
    package_id: int
    package_name: str
    guest_count: Optional[str] = None  # לדוגמה: "עד 100", "150 רשומות"


# ========== Endpoints ==========

@router.post("/initiate", status_code=status.HTTP_201_CREATED)
async def initiate_payment(payment: PaymentInitRequest):
    """
    יצירת תשלום חדש והחזרת נתוני טופס לשליחה לטרנזילה

    תהליך:
    1. יצירת רשומת package_purchase עם סטטוס pending
    2. יצירת נתוני טופס POST לטרנזילה
    3. החזרת הנתונים ללקוח כדי ששלח טופס POST אוטומטי
    """
    conn = None
    cur = None

    try:
        # חישוב מחיר מתוך ההגדרות
        package_config = PACKAGES_PRICING.get(payment.package_id)

        if not package_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"חבילה {payment.package_id} לא נמצאה"
            )

        # חישוב המחיר
        if "price" in package_config:
            # חבילה עם מחיר קבוע
            amount = package_config["price"]
        elif "prices" in package_config and payment.guest_count:
            # חבילה עם מחירים משתנים לפי כמות
            amount = package_config["prices"].get(payment.guest_count)
            if amount is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"כמות אורחים '{payment.guest_count}' לא תקינה לחבילה זו"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="חסרה כמות אורחים לחבילה זו"
            )

        print(f"[Payment Init] Package {payment.package_id}, Guest Count: {payment.guest_count}, Amount: ₪{amount}")

        conn = get_db_connection()
        cur = conn.cursor()

        # יצירת מזהה הזמנה ייחודי
        order_id = f"PKG-{payment.user_id}-{uuid.uuid4().hex[:8].upper()}"

        # יצירת רשומת רכישה עם סטטוס pending
        cur.execute("""
            INSERT INTO package_purchases (
                user_id, package_id, package_name,
                payment_status, payment_amount, payment_currency,
                tranzila_transaction_id, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            payment.user_id,
            payment.package_id,
            payment.package_name,
            'pending',
            amount,  # משתמשים ב-amount שחישבנו למעלה
            'ILS',
            order_id,
            'pending'
        ))

        purchase_id = cur.fetchone()[0]
        conn.commit()

        # בניית URLs - הסרת לוכסן כפול
        frontend_url = os.getenv("FRONTEND_URL", "https://event-gift-frontend.onrender.com").rstrip('/')
        backend_url = os.getenv("BACKEND_URL", "https://event-gift.onrender.com").rstrip('/')

        success_url = f"{frontend_url}/payment/success?order_id={order_id}&purchase_id={purchase_id}"
        fail_url = f"{frontend_url}/payment/failure?order_id={order_id}&purchase_id={purchase_id}"
        notify_url = f"{backend_url}/api/payments/callback?order_id={order_id}"

        print(f"[Payment URLs] Success: {success_url}")
        print(f"[Payment URLs] Fail: {fail_url}")
        print(f"[Payment URLs] Notify: {notify_url}")

        # קבלת פרטי המשתמש
        cur.execute("""
            SELECT full_name, email
            FROM users
            WHERE id = %s
        """, (payment.user_id,))

        user_data = cur.fetchone()
        customer_name = user_data[0] if user_data and user_data[0] else ""
        customer_email = user_data[1] if user_data and user_data[1] else ""

        # יצירת נתוני טופס
        form_data = tranzila.create_payment_form_data(
            order_id=order_id,
            amount=amount,  # משתמשים ב-amount שחישבנו
            success_url=success_url,
            fail_url=fail_url,
            notify_url=notify_url,
            customer_name=customer_name,
            customer_email=customer_email
        )

        return {
            "payment_url": tranzila.payment_url,
            "form_data": form_data,
            "order_id": order_id,
            "purchase_id": purchase_id,
            "amount": amount,  # משתמשים ב-amount שחישבנו
            "message": "התשלום נוצר בהצלחה"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Payment initiation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"שגיאה ביצירת התשלום: {str(e)}"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/callback")
@router.post("/callback")
async def payment_callback(request: Request):
    """
    Callback מטרנזילה - מקבל עדכון על סטטוס התשלום

    טרנזילה שולחת את הפרמטרים כ-GET או POST
    """
    conn = None
    cur = None

    try:
        # קבלת הפרמטרים (GET או POST)
        if request.method == "GET":
            callback_data = dict(request.query_params)
        else:
            callback_data = await request.form()
            callback_data = dict(callback_data)

        print(f"Tranzila callback received: {callback_data}")

        # אימות והפקת מידע
        payment_info = tranzila.verify_callback(callback_data)

        order_id = payment_info["order_id"]

        if not order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="מזהה הזמנה חסר"
            )

        conn = get_db_connection()
        cur = conn.cursor()

        # עדכון פרטי התשלום ב-DB
        if payment_info["success"]:
            # תשלום הצליח - Response = "000" או "00"
            cur.execute("""
                UPDATE package_purchases
                SET
                    payment_status = 'completed',
                    payment_date = NOW(),
                    tranzila_reference = %s,
                    payment_response = %s,
                    status = 'active'
                WHERE tranzila_transaction_id = %s
                RETURNING id;
            """, (
                payment_info["transaction_id"],
                json.dumps(payment_info["raw_data"]),
                order_id
            ))
        else:
            # תשלום נכשל
            cur.execute("""
                UPDATE package_purchases
                SET
                    payment_status = 'failed',
                    payment_date = NOW(),
                    payment_response = %s,
                    status = 'failed'
                WHERE tranzila_transaction_id = %s
                RETURNING id;
            """, (
                json.dumps(payment_info["raw_data"]),
                order_id
            ))

        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ההזמנה לא נמצאה"
            )

        conn.commit()

        return JSONResponse(content={
            "status": "ok",
            "message": "Callback processed successfully"
        })

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Callback processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"שגיאה בעיבוד ה-callback: {str(e)}"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@router.get("/status/{order_id}")
async def get_payment_status(order_id: str):
    """
    בדיקת סטטוס תשלום לפי מזהה הזמנה
    """
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                id, payment_status, payment_amount, payment_currency,
                payment_date, tranzila_reference, package_name,
                user_id, package_id
            FROM package_purchases
            WHERE tranzila_transaction_id = %s
        """, (order_id,))

        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="התשלום לא נמצא"
            )

        return {
            "purchase_id": row[0],
            "payment_status": row[1],
            "amount": float(row[2]) if row[2] else 0,
            "currency": row[3],
            "payment_date": row[4].isoformat() if row[4] else None,
            "reference": row[5],
            "package_name": row[6],
            "user_id": row[7],
            "package_id": row[8],
            "order_id": order_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get payment status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שגיאה בשליפת סטטוס התשלום"
        )
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
