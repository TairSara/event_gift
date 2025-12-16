"""
בדיקת סטטוס אמיתי של הודעות ב-Gupshup
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

print("🔍 בדיקת סטטוס Template ב-Gupshup\n")
print("=" * 80)

# 1. בדיקת רשימת Templates
templates_url = f"https://api.gupshup.io/wa/app/{GUPSHUP_APP_NAME}/templates"

headers = {
    "apikey": GUPSHUP_API_KEY
}

try:
    print("📋 שלב 1: בדיקת Templates זמינים\n")
    response = requests.get(templates_url, headers=headers, timeout=30)

    print(f"Response Status: {response.status_code}")

    if response.status_code == 200:
        try:
            data = response.json()
            print("\n✅ Templates שנמצאו:")
            print("-" * 80)

            templates = data.get('templates', [])
            event_invitation_found = False

            for template in templates:
                template_id = template.get('id', 'N/A')
                template_name = template.get('elementName', 'N/A')
                status = template.get('status', 'N/A')

                print(f"📄 Template: {template_name}")
                print(f"   ID: {template_id}")
                print(f"   Status: {status}")

                if template_name == "event_invitation_new":
                    event_invitation_found = True
                    print(f"   ⚠️ זה ה-Template שלך!")
                    if status != "APPROVED":
                        print(f"   ❌ בעיה: Template לא מאושר! סטטוס: {status}")
                        print(f"   💡 פתרון: צריך לאשר את ה-Template ב-Meta Business Manager")
                    else:
                        print(f"   ✅ Template מאושר!")

                print("-" * 80)

            if not event_invitation_found:
                print("\n❌ ⚠️ Template 'event_invitation_new' לא נמצא!")
                print("💡 זו כנראה הבעיה - ה-Template לא קיים או נמחק")

        except Exception as e:
            print(f"Error parsing response: {e}")
            print(f"Raw response: {response.text}")
    else:
        print(f"❌ שגיאה בקבלת Templates")
        print(f"Response: {response.text}")

except Exception as e:
    print(f"❌ שגיאה: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("📋 הסבר סטטוסי Template:")
print("=" * 80)
print("✅ APPROVED - Template מאושר ומוכן לשימוש")
print("⏳ PENDING - ממתין לאישור Meta")
print("❌ REJECTED - נדחה על ידי Meta")
print("⚠️ DISABLED - מושבת")
print()
print("⚠️ אם ה-Template לא APPROVED, ההודעות לא נשלחות!")
print("💡 פתרון: היכנסי ל-Meta Business Manager ואשרי את ה-Template")
