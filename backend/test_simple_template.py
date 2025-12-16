"""
בדיקה פשוטה של Template - בדיוק כמו ב-Gupshup UI
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY")
WHATSAPP_SENDER = os.getenv("WHATSAPP_SENDER_NUMBER", "972525869312")
TEMPLATE_NAME = "event_invitation_new"

url = "https://api.gupshup.io/wa/api/v1/template/msg"

headers = {
    "apikey": GUPSHUP_API_KEY,
    "Content-Type": "application/x-www-form-urlencoded",
}

# נתונים לדוגמה
template_params = [
    "תאיר טובול",           # {{1}} - שם אורח
    "חתונה",                # {{2}} - סוג אירוע
    "25/12/2025",           # {{3}} - תאריך
    "18:00",                # {{4}} - שעה
    "אולם הזהב, תל אביב"   # {{5}} - מקום
]

# ניסיון 1: ללא header בכלל
print("\n" + "="*60)
print("🧪 TEST 1: Template ללא header (Text template)")
print("="*60)

payload_1 = {
    "source": WHATSAPP_SENDER,
    "destination": "+972538212446",
    "template": json.dumps({
        "id": TEMPLATE_NAME,
        "params": template_params
    }, ensure_ascii=False)
}

resp_1 = requests.post(url, headers=headers, data=payload_1, timeout=30)
print(f"Status: {resp_1.status_code}")
print(f"Response: {resp_1.text}")

# אם נכשל, ננסה עם header
if resp_1.status_code not in (200, 202):
    print("\n" + "="*60)
    print("🧪 TEST 2: Template עם header (Media template)")
    print("="*60)

    payload_2 = {
        "source": WHATSAPP_SENDER,
        "destination": "+972538212446",
        "template": json.dumps({
            "id": TEMPLATE_NAME,
            "params": template_params,
            "header": {
                "type": "image",
                "image": {
                    "link": "https://i.imgur.com/9Q5Z6Zr.png"
                }
            }
        }, ensure_ascii=False)
    }

    resp_2 = requests.post(url, headers=headers, data=payload_2, timeout=30)
    print(f"Status: {resp_2.status_code}")
    print(f"Response: {resp_2.text}")

print("\n" + "="*60)
print("✅ בדיקה הושלמה")
print("="*60)
