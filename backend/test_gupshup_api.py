"""
בדיקה מעמיקה של Gupshup API
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY")
GUPSHUP_APP_NAME = os.getenv("GUPSHUP_APP_NAME", "saveday")

print("🔍 בדיקת Gupshup API\n")
print("=" * 80)
print(f"API Key: {GUPSHUP_API_KEY[:20]}...")
print(f"App Name: {GUPSHUP_APP_NAME}")
print("=" * 80)

headers = {
    "apikey": GUPSHUP_API_KEY
}

# ניסיון 1: בדיקת אפליקציה
print("\n📋 ניסיון 1: קבלת פרטי האפליקציה")
app_url = f"https://api.gupshup.io/wa/app/{GUPSHUP_APP_NAME}"

try:
    response = requests.get(app_url, headers=headers, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

# ניסיון 2: בדיקת Templates עם endpoint אחר
print("\n" + "=" * 80)
print("📋 ניסיון 2: קבלת Templates")
templates_url = "https://api.gupshup.io/sm/api/v1/template/list"

try:
    payload = {
        "appName": GUPSHUP_APP_NAME
    }
    response = requests.get(templates_url, headers=headers, params=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:1000]}")
except Exception as e:
    print(f"Error: {e}")

# ניסיון 3: שליחת הודעת בדיקה למספר שלך
print("\n" + "=" * 80)
print("📋 ניסיון 3: שליחת הודעת בדיקה")
print("⚠️ נשלח הודעה למספר 0538212446")

test_number = "+972538212446"  # המספר שלך מה-DB

test_url = "https://api.gupshup.io/wa/api/v1/template/msg"

import json

# ניסיון עם Template פשוט
template_payload = {
    "source": "972525869312",
    "destination": test_number,
    "template": json.dumps({
        "id": "event_invitation_new",
        "params": [
            "תאיר",
            "בר מצווה",
            "20/12/2025",
            "18:00",
            "אולם אירועים"
        ],
        "header": {
            "type": "image",
            "link": "https://i.imgur.com/9Q5Z6Zr.png"
        }
    }, ensure_ascii=False),
    "src.name": GUPSHUP_APP_NAME
}

headers_send = {
    "apikey": GUPSHUP_API_KEY,
    "Content-Type": "application/x-www-form-urlencoded"
}

try:
    response = requests.post(test_url, headers=headers_send, data=template_payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code in (200, 202):
        print("\n✅ הבקשה נשלחה!")
        try:
            data = response.json()
            message_id = data.get("messageId") or data.get("message_id")
            if message_id:
                print(f"📧 Message ID: {message_id}")
                print("\n⏳ ממתין 5 שניות ואז בודק סטטוס...")

                import time
                time.sleep(5)

                # בדיקת סטטוס
                status_url = f"https://api.gupshup.io/wa/api/v1/msg/{message_id}"
                status_response = requests.get(status_url, headers=headers, timeout=30)

                print(f"\n📊 סטטוס ההודעה:")
                print(f"Status Code: {status_response.status_code}")
                print(f"Response: {status_response.text}")

        except Exception as e:
            print(f"Error checking status: {e}")
    else:
        print(f"\n❌ השליחה נכשלה!")
        print("סיבות אפשריות:")
        print("1. Template 'event_invitation_new' לא קיים או לא מאושר")
        print("2. מספר השולח לא מאושר")
        print("3. בעיה בפורמט ה-Template")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("💡 מסקנות:")
print("=" * 80)
print("אם קיבלת שגיאה 400/401 - בעיה עם ה-Template או ה-API Key")
print("אם קיבלת 202/200 אבל הסטטוס 'failed' - Template לא מאושר ב-Meta")
print("אם קיבלת 202/200 והסטטוס 'sent'/'delivered' - הכל עובד!")
