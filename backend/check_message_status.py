"""
בדיקת סטטוס הודעה ב-Gupshup
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY")

# Message ID מהשליחה האחרונה
MESSAGE_ID = "b86644aa-c1c0-49de-b3bb-79af021a3941"

print(f"🔍 בודק סטטוס הודעה: {MESSAGE_ID}\n")

# Gupshup API לבדיקת סטטוס הודעה
url = f"https://api.gupshup.io/wa/api/v1/msg/{MESSAGE_ID}"

headers = {
    "apikey": GUPSHUP_API_KEY
}

try:
    response = requests.get(url, headers=headers, timeout=30)

    print(f"📊 Response Status: {response.status_code}")
    print(f"📄 Response:")
    print(response.text)
    print()

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ פרטי ההודעה:")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Destination: {data.get('destination', 'N/A')}")
            print(f"   Error (if any): {data.get('error', 'N/A')}")
        except:
            pass

except Exception as e:
    print(f"❌ שגיאה: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("📋 הסבר סטטוסים אפשריים:")
print("="*60)
print("✅ sent - ההודעה נשלחה בהצלחה")
print("✅ delivered - ההודעה הגיעה ליעד")
print("✅ read - ההודעה נקראה")
print("❌ failed - השליחה נכשלה")
print("⏳ pending - ממתין לאישור")
print()
print("⚠️ אם הסטטוס 'failed' או 'pending', זה יכול להיות:")
print("   1. Template לא מאושר ב-Meta")
print("   2. מספר לא רשום ב-WhatsApp")
print("   3. צריך אישור opt-in מהמשתמש")
