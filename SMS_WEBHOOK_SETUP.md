# מדריך הגדרת Webhook לקבלת תשובות SMS

## סקירה כללית
המערכת כעת תומכת בקבלת תשובות אוטומטיות מהמוזמנים ועדכון הסטטוס שלהם בבסיס הנתונים.

---

## 🔄 זרימת העבודה (Workflow)

### שלב 1: שליחת הזמנה
המערכת שולחת SMS להזמנה עם ההודעה:
```
שלום {שם},
אנו שמחים להזמינכם
ל{שם אירוע}
בתאריך {תאריך} בשעה {שעה}
מיקום: {מיקום}
נא הגיבו בהודעה חוזרת 1 אם אתם מגיעים, אחרת - 0.
```

### שלב 2: תשובת המוזמן - אפשרות א' (מגיע)
**המוזמן מגיב: `1`**

1. המערכת מקבלת את התשובה דרך webhook
2. מעדכנת סטטוס ל-`tentative` (זמני)
3. שולחת הודעה חוזרת:
   ```
   מעולה! כמה תגיעו? (רשמו את מספר המגיעים, לדוגמא: 2)
   ```

**המוזמן מגיב: `2` (או כל מספר אחר)**

1. המערכת מקבלת את המספר
2. מעדכנת:
   - סטטוס ל-`confirmed`
   - `attending_count` למספר שהוזן
3. שולחת הודעת אישור:
   ```
   תודה רבה! רשמנו {מספר} מגיעים. נשמח לראותכם!
   ```

### שלב 3: תשובת המוזמן - אפשרות ב' (לא מגיע)
**המוזמן מגיב: `0`**

1. המערכת מקבלת את התשובה
2. מעדכנת:
   - סטטוס ל-`declined`
   - `attending_count` ל-`0`
3. שולחת הודעת תודה:
   ```
   תודה על העדכון! נשמח לראותך בהזדמנות אחרת!
   ```

---

## 🔧 הגדרת Webhook ב-019SMS

### שלב 1: כניסה לפאנל ניהול של 019SMS
1. היכנס ל-[019SMS Dashboard](https://019sms.co.il/)
2. עבור להגדרות API / Webhooks

### שלב 2: הוספת Webhook URL

הוסף את ה-URL הבא כ-Webhook URL להודעות נכנסות:

**Production (Render):**
```
https://event-gift.onrender.com/api/sms-webhook/incoming
```

**Development (Local):**
```
http://localhost:8000/api/sms-webhook/incoming
```

### שלב 3: בחירת אירועים (Events)
בחר באירוע: **"Incoming SMS"** או **"Message Received"**

### שלב 4: פורמט Webhook
וודא שה-webhook מגדיר:
- **Method:** POST
- **Content-Type:** application/json

הפורמט המצופה:
```json
{
  "from": "0501234567",
  "message": "1",
  "timestamp": "2025-12-21 10:30:00",
  "message_id": "msg_12345"
}
```

---

## 🧪 בדיקת Webhook

### בדיקה 1: Health Check
בדוק שה-webhook פעיל:
```bash
GET https://event-gift.onrender.com/api/sms-webhook/health
```

תשובה מצופה:
```json
{
  "status": "ok",
  "webhook_url": "/api/sms-webhook/incoming",
  "active_states": 0
}
```

### בדיקה 2: Test Endpoint (Development בלבד)
בדוק את הלוגיקה ללא 019SMS:
```bash
POST http://localhost:8000/api/sms-webhook/test?from_number=0501234567&message=1
```

### בדיקה 3: בדיקה מלאה
1. שלח SMS למוזמן מהמערכת
2. בקש מהמוזמן להגיב `1`
3. בדוק שהוא מקבל את השאלה "כמה תגיעו?"
4. בקש מהמוזמן להגיב `2`
5. בדוק שהסטטוס התעדכן במערכת ל-`confirmed` עם `attending_count = 2`

---

## 📊 עדכוני בסיס נתונים

### טבלת `guests` - עמודות רלוונטיות:

| עמודה | ערכים אפשריים | תיאור |
|-------|---------------|--------|
| `status` | `pending`, `tentative`, `confirmed`, `declined` | סטטוס ההזמנה |
| `attending_count` | מספר (0 ומעלה) | כמות מגיעים |
| `updated_at` | timestamp | מועד עדכון אחרון |

### זרימת סטטוסים:

```
pending (ברירת מחדל)
    ↓
    → תגובה "1" → tentative (ממתין למספר מגיעים)
    |               ↓
    |               → תגובה "2" → confirmed (אושר עם 2 מגיעים)
    |
    → תגובה "0" → declined (דחה את ההזמנה)
```

---

## 🔍 Troubleshooting

### בעיה: Webhook לא מקבל הודעות
**פתרונות:**
1. בדוק שה-URL נכון ב-019SMS dashboard
2. ודא שהשרת ב-Render פעיל
3. בדוק logs ב-Render Dashboard → Logs
4. ודא שאין firewall/security rules שחוסמים את ה-webhook

### בעיה: סטטוס לא מתעדכן
**פתרונות:**
1. בדוק שמספר הטלפון במאגר תואם למספר השולח
2. בדוק logs לשגיאות בעדכון בסיס נתונים
3. ודא שהטבלה `guests` מכילה עמודות `status` ו-`attending_count`

### בעיה: המערכת לא שולחת תשובות אוטומטיות
**פתרונות:**
1. בדוק שיש יתרה מספקת ב-019SMS
2. בדוק credentials ב-environment variables
3. ודא ש-API token תקף ולא פג תוקף

### בעיה: מוזמן תקוע ב-"waiting for count"
**פתרון:**
State machine מאוחסן בזיכרון. אם השרת מתחיל מחדש, המצב יאבד.
הפתרון: המוזמן יכול להגיב `1` שוב ולהתחיל מחדש.

---

## 📋 Endpoints חדשים

### 1. Webhook Handler (מקבל הודעות מ-019SMS)
```
POST /api/sms-webhook/incoming
Content-Type: application/json

{
  "from": "0501234567",
  "message": "1"
}
```

### 2. Health Check
```
GET /api/sms-webhook/health
```

### 3. Test Endpoint (Development)
```
POST /api/sms-webhook/test?from_number=0501234567&message=1
```

---

## 📁 קבצים שנוצרו/שונו

### Backend:
- ✅ `backend/sms_webhook.py` - טיפול ב-webhooks ותשובות אוטומטיות (חדש)
- ✅ `backend/main.py` - רישום router של webhook
- ✅ `backend/sms_service.py` - עודכן עם שורת התשובה
- ✅ `backend/sms_router.py` - עודכן עם שורת התשובה

### Documentation:
- ✅ `SMS_WEBHOOK_SETUP.md` - מדריך זה

---

## 🔐 אבטחה

### נקודות חשובות:
1. **אימות Webhook**: כדאי להוסיף אימות ל-webhook (signature verification)
2. **Rate Limiting**: הגבלת קצב בקשות למניעת spam
3. **Phone Number Validation**: ודא שמספר הטלפון תקין לפני עדכון

### הוספת אימות (אופציונלי):
אם 019SMS תומך ב-webhook signature, הוסף בדיקה:
```python
# בתחילת handle_incoming_sms
signature = request.headers.get('X-019SMS-Signature')
if not verify_signature(payload, signature):
    raise HTTPException(status_code=401, detail="Invalid signature")
```

---

## 📞 תמיכה טכנית

אם יש בעיות:
1. בדוק את ה-logs ב-Render Dashboard
2. ודא ש-webhook מוגדר נכון ב-019SMS
3. בדוק שכל environment variables מוגדרים
4. צור קשר עם תמיכת 019SMS לעזרה בהגדרת webhook

---

## ✅ Checklist להפעלה

- [ ] עדכון קוד ב-Git ופריסה ל-Render
- [ ] וידוא ש-webhook endpoint פעיל (`/api/sms-webhook/health`)
- [ ] הגדרת webhook URL ב-019SMS dashboard
- [ ] בדיקת תשובה "1" (מגיע)
- [ ] בדיקת תשובה עם מספר מגיעים
- [ ] בדיקת תשובה "0" (לא מגיע)
- [ ] וידוא שהסטטוסים מתעדכנים בממשק המשתמש

🎉 **הצלחה! המערכת כעת תומכת בתשובות אוטומטיות ועדכון סטטוסים!**
