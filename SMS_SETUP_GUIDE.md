# מדריך הגדרת SMS עם 019SMS API

## סקירה כללית
המערכת כעת תומכת בשליחת הזמנות דרך SMS בנוסף ל-WhatsApp, באמצעות שירות 019SMS.

---

## 🔧 הגדרות סביבה (Environment Variables)

### עבור פיתוח מקומי (Local Development)

צור קובץ `.env` בתיקיית `backend/` והוסף את השורות הבאות:

```env
# 019SMS Configuration
SMS_019_USERNAME=2you
SMS_019_API_TOKEN=eyJ0eXAiOiJqd3QiLCJhbGciOiJIUzI1NiJ9.eyJmaXJzdF9rZXkiOiI2NzUxOSIsInNlY29uZF9rZXkiOiIzNjk0Njc1IiwiaXNzdWVkQXQiOiIyMS0xMi0yMDI1IDEwOjI4OjAyIiwidHRsIjo2MzA3MjAwMH0.HYwPocSb6PPAE6G6yfgLLweG_LWfBvGz-Z9RdMfYzaM
SMS_019_TEMPLATE_NAME=SAVEDAY_INVITE
```

---

## ☁️ הגדרות ב-Render (Production)

### שלב 1: כניסה לפרויקט ב-Render
1. היכנס ל-[Render Dashboard](https://dashboard.render.com/)
2. בחר את שירות ה-Backend שלך

### שלב 2: הוספת Environment Variables
1. לחץ על **Environment** בתפריט הצד
2. לחץ על **Add Environment Variable**
3. הוסף את המשתנים הבאים **בדיוק כפי שכתוב**:

#### משתנה 1:
- **Key**: `SMS_019_USERNAME`
- **Value**: `2you`

#### משתנה 2:
- **Key**: `SMS_019_API_TOKEN`
- **Value**: `eyJ0eXAiOiJqd3QiLCJhbGciOiJIUzI1NiJ9.eyJmaXJzdF9rZXkiOiI2NzUxOSIsInNlY29uZF9rZXkiOiIzNjk0Njc1IiwiaXNzdWVkQXQiOiIyMS0xMi0yMDI1IDEwOjI4OjAyIiwidHRsIjo2MzA3MjAwMH0.HYwPocSb6PPAE6G6yfgLLweG_LWfBvGz-Z9RdMfYzaM`

#### משתנה 3:
- **Key**: `SMS_019_TEMPLATE_NAME`
- **Value**: `SAVEDAY_INVITE`

### שלב 3: שמירה ופריסה מחדש
1. לחץ על **Save Changes**
2. Render יפעיל מחדש את השירות באופן אוטומטי
3. המתן כמה דקות עד שהשירות יהיה זמין שוב

---

## 📱 מבנה התבנית ב-019SMS

התבנית שלך מכילה **5 שדות דינמיים** לפי הסדר הבא:

1. **שדה דינמי 1** - ברכת פתיחה (לדוגמה: "שלום יוסי,")
2. **שדה דינמי 2** - טקסט פתיחה (לדוגמה: "אנו שמחים להזמינכם")
3. **שדה דינמי 3** - תיאור האירוע (שם האירוע)
4. **שדה דינמי 4** - תאריך ושעה משולבים (לדוגמה: "25/12/2025 בשעה 19:00")
5. **שדה דינמי 5** - מיקום האירוע

המערכת ממלאת אוטומטית את השדות האלה לפי פרטי האירוע והאורח.

---

## 🧪 בדיקת התקנה

### בדיקה 1: בדיקת Health Endpoint
לאחר הפריסה, גש ל:
```
https://event-gift.onrender.com/api/sms/health
```

אם הכל תקין, תקבל תשובה כמו:
```json
{
  "status": "configured",
  "username": "2you",
  "template_name": "SAVEDAY_INVITE",
  "api_url": "https://019sms.co.il/api"
}
```

אם הגדרת משהו לא נכון, תקבל:
```json
{
  "status": "not_configured",
  "username": null,
  "template_name": "SAVEDAY_INVITE",
  "api_url": "https://019sms.co.il/api"
}
```

### בדיקה 2: שליחת SMS בפועל
1. היכנס למערכת
2. פתח אירוע עם מוזמנים
3. לחץ על כפתור **SMS** (הכפתור הכחול) ליד מוזמן מסוים
4. בדוק שההודעה התקבלה

---

## 🎨 אפשרויות הממשק

### כפתורים למוזמן בודד:
- **כפתור WhatsApp (ירוק)** - שולח הזמנה ב-WhatsApp
- **כפתור SMS (כחול)** - שולח הזמנה ב-SMS

### כפתורים לכל המוזמנים:
- **"שלח הזמנות לכולם"** (ירוק) - שולח WhatsApp לכל המוזמנים
- **"שלח SMS לכולם"** (כחול) - שולח SMS לכל המוזמנים

---

## 🔍 Troubleshooting

### בעיה: SMS לא נשלח
**פתרונות:**
1. בדוק שמספר הטלפון במוזמן בפורמט תקין (עם 972 או 0)
2. בדוק את ה-logs ב-Render Dashboard → Logs
3. וודא שה-API Token תקף (לא פג תוקף)
4. בדוק שיש יתרה מספקת בחשבון 019SMS

### בעיה: "not_configured" בבדיקת Health
**פתרונות:**
1. בדוק שהמשתנים הוגדרו נכון ב-Render (ללא רווחים מיותרים)
2. ודא שביצעת Deploy מחדש אחרי הוספת המשתנים
3. המתן 2-3 דקות עד שה-service יעלה מחדש

### בעיה: הכפתורים לא מופיעים
**פתרונות:**
1. רענן את דף הדפדפן (Ctrl+Shift+R / Cmd+Shift+R)
2. נקה את ה-cache של הדפדפן
3. בדוק שה-Frontend עבר Deploy מחדש

---

## 📋 קבצים שנוצרו/שונו

### Backend:
- `backend/sms_service.py` - שירות שליחת SMS
- `backend/sms_router.py` - API endpoints לשליחת SMS
- `backend/main.py` - רישום router של SMS
- `backend/.env.example` - תבנית להגדרות

### Frontend:
- `frontend/src/services/api.js` - פונקציות API לשליחת SMS
- `frontend/src/components/GuestManagement.jsx` - כפתורי SMS בממשק

---

## 📞 תמיכה

אם יש בעיות:
1. בדוק את ה-logs ב-Render Dashboard
2. בדוק את תיעוד 019SMS: https://docs.019sms.co.il/guide/
3. ודא שה-API Token לא פג תוקף (יש ל-019SMS מגבלה של TTL לטוקנים)

---

## ✅ Checklist להפעלה

- [ ] הוספת משתנים ב-Render:
  - [ ] `SMS_019_USERNAME`
  - [ ] `SMS_019_API_TOKEN`
  - [ ] `SMS_019_TEMPLATE_NAME`
- [ ] שמירה ופריסה מחדש ב-Render
- [ ] בדיקת `/api/sms/health` endpoint
- [ ] בדיקת שליחת SMS למוזמן בודד
- [ ] בדיקת שליחת SMS לכולם

🎉 **הצלחה! המערכת כעת תומכת בשליחת SMS!**
