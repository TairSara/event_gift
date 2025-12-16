"""
בדיקת סטטוס Template ב-Gupshup
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY")
GUPSHUP_APP_NAME = os.getenv("GUPSHUP_APP_NAME")

print("🔍 בודק סטטוס Templates ב-Gupshup...\n")
print(f"📱 App Name: {GUPSHUP_APP_NAME}")
print(f"🔑 API Key: {GUPSHUP_API_KEY[:20]}...")
print()

# בדיקת סטטוס App
url = f"https://api.gupshup.io/wa/app/{GUPSHUP_APP_NAME}"

headers = {
    "apikey": GUPSHUP_API_KEY
}

try:
    response = requests.get(url, headers=headers, timeout=30)

    print(f"📊 Response Status: {response.status_code}")
    print(f"📄 Response Body:")
    print(response.text)
    print()

    if response.status_code == 200:
        try:
            data = response.json()

            if "templates" in data:
                templates = data["templates"]
                print(f"✅ נמצאו {len(templates)} Templates:")
                print()

                for template in templates:
                    name = template.get("elementName", "N/A")
                    status = template.get("status", "N/A")
                    lang = template.get("languageCode", "N/A")

                    print(f"📋 Template: {name}")
                    print(f"   Status: {status}")
                    print(f"   Language: {lang}")
                    print()

                    if name == "event_invitation_new":
                        print(f"🎯 נמצא Template הנכון!")
                        if status == "APPROVED":
                            print("✅ Template מאושר!")
                        else:
                            print(f"⚠️ Template לא מאושר - Status: {status}")
                        print()
            else:
                print("❌ לא נמצאו Templates")

        except Exception as e:
            print(f"❌ שגיאה בפענוח: {e}")
    else:
        print(f"❌ שגיאה: {response.status_code}")

except Exception as e:
    print(f"❌ שגיאה בשליחת בקשה: {e}")
    import traceback
    traceback.print_exc()
