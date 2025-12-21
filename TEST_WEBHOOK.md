# בדיקת SMS Webhook

## מה השתנה? ✅

ה-webhook עודכן לתמוך ב-**GET requests** עם query parameters (כמו ש-019SMS שולח).

---

## 🧪 בדיקה מהירה

### 1. בדוק שה-endpoint עובד (לאחר deploy):

```bash
# בדיקת GET (כמו 019SMS)
curl "https://event-gift.onrender.com/api/sms-webhook/incoming?msisdn=0547804286&msg=1"
```

**תשובה מצופה:**
```json
{
  "status": "ok",
  "message": "Guest confirmed attendance, waiting for count",
  "guest_id": 10
}
```

ואתה אמור לקבל SMS חוזר: **"מעולה! כמה תגיעו? (רשמו את מספר המגיעים, לדוגמא: 2)"**

---

### 2. בדוק את השלב השני:

```bash
curl "https://event-gift.onrender.com/api/sms-webhook/incoming?msisdn=0547804286&msg=2"
```

**תשובה מצופה:**
```json
{
  "status": "ok",
  "message": "Guest confirmed with 2 attendees",
  "guest_id": 10,
  "attending_count": 2
}
```

ואתה אמור לקבל SMS: **"תודה רבה! רשמנו 2 מגיעים. נשמח לראותכם!"**

---

### 3. בדוק תשובה שלילית:

```bash
curl "https://event-gift.onrender.com/api/sms-webhook/incoming?msisdn=0547804286&msg=0"
```

**תשובה מצופה:**
```json
{
  "status": "ok",
  "message": "Guest declined invitation",
  "guest_id": 10
}
```

ואתה אמור לקבל SMS: **"תודה על העדכון! נשמח לראותך בהזדמנות אחרת!"**

---

## 🔧 הגדרת 019SMS Webhook

כעת כשהקוד תומך ב-GET, תוכל להגדיר ב-019SMS:

1. **URL:** `https://event-gift.onrender.com/api/sms-webhook/incoming`
2. **Method:** GET (לא POST!)
3. **Parameters:**
   - `msisdn` - מספר השולח
   - `msg` - תוכן ההודעה

---

## 📋 פורמט ה-URL ש-019SMS ישלח:

```
https://event-gift.onrender.com/api/sms-webhook/incoming?msisdn=0547804286&msg=1
```

---

## ✅ Checklist

- [x] עדכון הקוד לתמוך ב-GET requests
- [x] עדכון לחפש `msisdn` ו-`msg` parameters
- [x] החזרת `{"status": "ok"}` בכל מקרה (למנוע retry)
- [ ] Git push + Deploy ל-Render
- [ ] בדיקת endpoint עם curl
- [ ] הגדרת webhook ב-019SMS
- [ ] בדיקה אמיתית - שליחת SMS ותשובה

---

## 🎯 צעדים הבאים:

1. **Push הקוד:**
   ```bash
   git add .
   git commit -m "Fix SMS webhook to support GET requests from 019SMS"
   git push
   ```

2. **המתן ל-Deploy** (2-3 דקות)

3. **בדוק את ה-endpoint:**
   ```bash
   curl "https://event-gift.onrender.com/api/sms-webhook/incoming?msisdn=0547804286&msg=1"
   ```

4. **הגדר ב-019SMS Dashboard:**
   - Webhook URL: `https://event-gift.onrender.com/api/sms-webhook/incoming`
   - Method: **GET**
   - Event: Incoming SMS / Reply Messages

5. **בדיקה אמיתית:**
   - שלח SMS למוזמן
   - הגב "1" מהטלפון
   - בדוק שקיבלת "מעולה! כמה תגיעו?"
   - הגב "2"
   - בדוק שקיבלת "תודה רבה! רשמנו 2 מגיעים"

---

**הכל מוכן! כעת המערכת תומכת בפרוטוקול הנכון של 019SMS! 🎉**
