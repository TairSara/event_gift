# מערכת המיילים - SaveDay Events

## סקירה כללית

המערכת שולחת מיילים מעוצבים אוטומטית במקרים הבאים:
1. **ברוכים הבאים** - כאשר משתמש חדש נרשם לאתר
2. **קוד איפוס סיסמה** - כאשר משתמש מבקש לאפס את הסיסמה
3. **אישור איפוס** - כאשר הסיסמה אופסה בהצלחה

## הגדרות

### 1. App Password של Gmail

המערכת משתמשת ב-App Password של Gmail לשליחת מיילים. הפרטים נמצאים ב-`.env`:

```env
SENDER_EMAIL=savedayevents@gmail.com
SENDER_PASSWORD=zvlk gtrc uzhd pkvj
```

⚠️ **חשוב**: זה App Password ולא הסיסמה הרגילה של Gmail!

### 2. איך ליצור App Password ב-Gmail

אם תצטרך ליצור App Password חדש בעתיד:

1. היכנס לחשבון Gmail שלך
2. עבור ל-Google Account Settings
3. Security → 2-Step Verification (צריך להפעיל אם עוד לא מופעל)
4. App passwords → Select app: Mail → Select device: Other
5. תן שם (למשל: "SaveDay Events")
6. העתק את הסיסמה שנוצרה (16 תווים)
7. עדכן את `SENDER_PASSWORD` ב-`.env`

## עיצוב המיילים

כל המיילים כוללים:
- 🎨 עיצוב מותאם אישית בצבעי האתר (ורוד)
- 🖼️ לוגו של SaveDay Events
- 📱 תמיכה בעברית (RTL)
- 💌 עיצוב רספונסיבי למובייל

## בדיקת המערכת

### בדיקה ידנית

הרץ את הסקריפט:

```bash
cd backend
python test_email.py
```

הסקריפט יבקש ממך:
1. להזין מייל לבדיקה
2. לבחור איזה סוג מייל לשלוח
3. יודיע לך אם המייל נשלח בהצלחה

### בדיקה דרך ה-API

#### 1. בדיקת הרשמה (מייל ברוכים הבאים)

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "password123",
    "full_name": "שם מלא"
  }'
```

#### 2. בדיקת איפוס סיסמה (מייל עם קוד)

```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com"
  }'
```

#### 3. בדיקת אישור איפוס (מייל הצלחה)

```bash
curl -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "code": "123456",
    "new_password": "newpassword123"
  }'
```

## קבצים רלוונטיים

- `email_service.py` - שירות שליחת המיילים
- `auth.py` - נקודות הקצה שמשתמשות במיילים
- `.env` - הגדרות אימייל
- `test_email.py` - סקריפט בדיקה

## טיפים

### אם המיילים לא מגיעים:

1. ✅ בדוק שה-App Password נכון ב-`.env`
2. ✅ בדוק את תיקיית ה-Spam
3. ✅ וודא ש-2-Step Verification מופעל ב-Gmail
4. ✅ נסה ליצור App Password חדש
5. ✅ בדוק את לוגים של השרת אם יש שגיאות

### Security Notes

- ⚠️ אל תשתף את ה-App Password עם אף אחד
- ⚠️ אל תעלה את קובץ `.env` ל-Git
- ⚠️ ודא שיש `.env` ב-`.gitignore`

## דוגמאות למיילים

### מייל ברוכים הבאים
- כותרת: "🎉 ברוכים הבאים ל-SaveDay Events!"
- תוכן: הסבר על האתר ותכונותיו
- כפתור פעולה: "התחל עכשיו"

### מייל קוד איפוס
- כותרת: "🔐 קוד איפוס סיסמה - SaveDay Events"
- תוכן: קוד בן 6 ספרות
- אזהרה: הקוד תקף ל-15 דקות

### מייל אישור איפוס
- כותרת: "✅ הסיסמה אופסה בהצלחה"
- תוכן: אישור ועצות אבטחה
- כפתור פעולה: "התחבר לחשבון"

## פתרון בעיות נפוצות

### "Authentication failed"
→ App Password לא נכון או פג תוקף. צור חדש.

### "Connection refused"
→ בדוק חיבור לאינטרנט או שהפורט 587 לא חסום.

### "SMTP timeout"
→ הגדרות Firewall חוסמות את הפורט.

### המיילים מגיעים ל-Spam
→ זה נורמלי בשלב הפיתוח. בפרודקשן תצטרך SPF/DKIM records.

---

**נוצר ב-2025 | SaveDay Events**
