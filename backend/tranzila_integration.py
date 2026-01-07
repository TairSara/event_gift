"""
אינטגרציה עם מערכת התשלומים של טרנזילה
מבוסס על שליחת POST form ישירות לטרנזילה
"""
import os
from typing import Dict


class TranzilaPayment:
    """מחלקה לניהול תשלומים דרך טרנזילה"""

    def __init__(self):
        self.terminal_name = os.getenv("TRANZILA_TERMINAL_NAME", "saveday1")
        # כתובת היעד לשליחת הטופס
        self.payment_url = f"https://direct.tranzila.com/{self.terminal_name}"

    def create_payment_form_data(
        self,
        order_id: str,
        amount: float,
        success_url: str,
        fail_url: str,
        notify_url: str,
        customer_name: str = "",
        customer_email: str = ""
    ) -> Dict[str, str]:
        """
        יצירת נתוני הטופס לשליחה לטרנזילה

        Args:
            order_id: מזהה הזמנה ייחודי
            amount: סכום לחיוב
            success_url: כתובת חזרה בהצלחה
            fail_url: כתובת חזרה בכישלון
            notify_url: כתובת webhook לעדכון אסינכרוני
            customer_name: שם הלקוח
            customer_email: אימייל הלקוח

        Returns:
            Dict עם כל השדות הנדרשים לטופס
        """
        form_data = {
            # שדות חובה לפי מפרט טרנזילה
            "supplier": self.terminal_name,
            "sum": str(amount),
            "currency": "1",  # 1 = ILS (שקל חדש)
            "cred_type": "1",  # 1 = חיוב רגיל

            # כתובות חזרה
            "success_url_address": success_url,
            "fail_url_address": fail_url,
            "notify_url_address": notify_url,

            # מזהה הזמנה - נשלח כפרמטר נפרד ב-notify_url
            "order_id": order_id,
        }

        # שדות אופציונליים
        if customer_name:
            form_data["contact"] = customer_name

        if customer_email:
            form_data["email"] = customer_email

        return form_data

    def verify_callback(self, callback_data: Dict) -> Dict:
        """
        אימות והפקת מידע מתגובת טרנזילה ב-notify callback

        Args:
            callback_data: נתונים שהתקבלו מטרנזילה

        Returns:
            Dict עם סטטוס התשלום והמידע הרלוונטי
        """
        response_code = callback_data.get("Response", "")
        # order_id מגיע מהשדה שעברנו בטופס
        order_id = callback_data.get("order_id", "")

        # בדיקת הצלחה: Response = "000" או "00"
        success = response_code in ["000", "00"]

        print(f"[Tranzila Callback] Response: {response_code}, Order ID: {order_id}, Success: {success}")

        return {
            "success": success,
            "response_code": response_code,
            "order_id": order_id,
            "transaction_id": callback_data.get("TranzilaTK", ""),  # מזהה עסקה מטרנזילה
            "card_suffix": callback_data.get("ccno", ""),  # 4 ספרות אחרונות של הכרטיס
            "confirmation_code": callback_data.get("ConfirmationCode", ""),  # קוד אישור
            "raw_data": callback_data
        }


# יצירת instance גלובלי
tranzila = TranzilaPayment()
