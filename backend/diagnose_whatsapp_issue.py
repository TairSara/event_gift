"""
אבחון מעמיק של בעיית WhatsApp - למה הודעות לא מגיעות
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

print("🔍 אבחון מעמיק - למה הודעות לא מגיעות")
print("=" * 80)

# 1. בדיקת Webhook URL
print("\n📋 1. בדיקת Webhook Configuration")
print("-" * 80)
print("⚠️ ייתכן שצריך להגדיר Webhook URL ב-Gupshup:")
print("   URL שצריך להגדיר: https://your-domain.com/api/invitations/webhook/gupshup")
print("   אם אין Webhook, Gupshup עדיין שולח הודעות אבל לא מדווח על תשובות")

# 2. בדיקת Opt-in
print("\n📋 2. בדיקת Opt-in (הכי חשוב!)")
print("-" * 80)
print("⚠️ WhatsApp Business API דורש Opt-in מהמשתמש!")
print()
print("🔴 בעיה נפוצה: משתמש חייב לשלוח הודעה ראשונה לעסק")
print("   או לאשר opt-in דרך form/QR code")
print()
print("💡 פתרון:")
print("   1. המשתמשים צריכים לשלוח הודעה למספר 972525869312")
print("   2. או להגדיר opt-in form ב-Gupshup")
print("   3. רק אז ניתן לשלוח להם template messages")

# 3. בדיקת חלון 24 שעות
print("\n📋 3. בדיקת חלון 24 שעות")
print("-" * 80)
print("⚠️ WhatsApp מאפשר לשלוח template messages רק אם:")
print("   - יש opt-in מהמשתמש, או")
print("   - המשתמש שלח הודעה ב-24 שעות האחרונות")

# 4. בדיקת סטטוס הודעות קיימות
print("\n📋 4. בדיקת הודעות קיימות ב-Gupshup")
print("-" * 80)
print("🔍 בדיקה אם יש גישה ל-Messages API...")

headers = {"apikey": GUPSHUP_API_KEY}

# ניסיון לקבל רשימת הודעות אחרונות (אם יש API כזה)
try:
    # Gupshup לא תמיד מספק API לרשימת הודעות, צריך Dashboard
    print("⚠️ Gupshup לא מספק API ציבורי לרשימת הודעות")
    print("💡 צריך לבדוק ב-Dashboard: https://www.gupshup.io/developer/dashboard")
    print("   בחר 'Messages' בתפריט ותראה את כל ההודעות שנשלחו")
except Exception as e:
    print(f"Error: {e}")

# 5. סיכום הבעיות האפשריות
print("\n" + "=" * 80)
print("📊 סיכום - סיבות אפשריות למה הודעות לא מגיעות:")
print("=" * 80)
print()
print("1. 🔴 חסר Opt-in מהמשתמשים (הסיבה הנפוצה ביותר!)")
print("   פתרון: המשתמשים צריכים לשלוח הודעה ראשונה")
print()
print("2. ⏰ חלון 24 שעות נסגר")
print("   פתרון: שלח הודעה רק אחרי שהמשתמש יצר קשר")
print()
print("3. 🚫 מספר לא קיים ב-WhatsApp")
print("   פתרון: וודא שהמספר רשום ב-WhatsApp")
print()
print("4. ⚙️ בעיה בהגדרות Gupshup")
print("   פתרון: בדוק ב-Dashboard שהכל מוגדר נכון")
print()
print("5. 💰 מכסה נגמרה (חשבון Trial)")
print("   פתרון: בדוק במסך Billing")
print()
print("=" * 80)
print("💡 המלצה: היכנסי ל-Gupshup Dashboard ובדקי:")
print("   - Messages → תראי את הסטטוס של ההודעות שנשלחו")
print("   - Settings → Webhook Configuration")
print("   - Billing → מכסת הודעות")
print("=" * 80)

# 6. בדיקת הודעת טסט עם opt-in check
print("\n📋 6. שליחת הודעת בדיקה למספר שלך")
print("-" * 80)
print("⚠️ זה ישלח הודעה למספר 0538212446")
print("   אם לא תקבלי - הבעיה היא opt-in!")
print()

test_number = "+972538212446"

# קודם כל - בדיקה אם המספר הזה כבר שלח הודעה (יש opt-in)
print("💡 טיפ: לפני שאנחנו שולחים, שלחי הודעה למספר 972525869312")
print("   כתבי משהו פשוט כמו 'שלום'")
print("   זה ייתן לך opt-in ואז ההודעות יגיעו!")
