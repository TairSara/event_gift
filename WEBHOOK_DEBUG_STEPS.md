# שלבי איתור בעיה ב-Webhook

## הבעיה הנוכחית:
הודעות מגיעות ל-webhook אבל מוחזר:
```json
{"status":"ok","message":"Missing required parameters"}
```

זה אומר ש-019SMS שולח פרמטרים עם **שמות שונים** מאלה שאנחנו מחפשים.

---

## 📋 מה לעשות עכשיו?

### שלב 1: Deploy הקוד המעודכן עם Logging
```bash
git add .
git commit -m "Add comprehensive webhook parameter logging"
git push
```

המתן 2-3 דקות עד ש-Render יעשה deploy.

---

### שלב 2: שלח SMS ותגובה
1. שלח SMS למוזמן (מקסי - 0547804286)
2. הגב **1** למספר שממנו קיבלת את ההודעה
3. המתן 10 שניות

---

### שלב 3: צפה ב-Logs ב-Render

1. כנס ל-[Render Dashboard](https://dashboard.render.com/)
2. בחר את השירות `event-gift`
3. לחץ על **Logs** בתפריט העליון
4. חפש בלוג שורות שמתחילות ב-`📥 Received SMS webhook (GET)`
5. **תעתיק את כל השורות הללו**:
   ```
   📥 Received SMS webhook (GET)
      All params: {...}
      Extracted: from_number=..., message=...
   ```

---

### שלב 4: שתף את ה-Logs

העתק ושלח לי את השורות האלה **בדיוק כמו שהן**, במיוחד את השורה:
```
All params: {...}
```

זה יאפשר לי לראות מה ה-**שמות המדויקים** של הפרמטרים ש-019SMS שולח.

---

## 🔍 מה אנחנו מחפשים?

הקוד כרגע מחפש את הפרמטרים האלה:

**למספר טלפון:**
- `msisdn` ✅ (זה מה ש-019SMS אמורים לשלוח לפי התיעוד)
- `from`
- `phone`
- `sender`

**להודעה:**
- `msg` ✅ (זה מה ש-019SMS אמורים לשלוח לפי התיעוד)
- `message`
- `text`
- `content`

אבל ייתכן ש-019SMS משתמשים בשמות **שונים לגמרי** (לדוגמא: `phoneNumber`, `msgContent`, `smsBody`, וכו').

---

## ⚡ בדיקה מהירה (אופציונלי)

אם אתה רוצה לבדוק ידנית מה ה-webhook מקבל:

```bash
# בדיקה עם curl
curl "https://event-gift.onrender.com/api/sms-webhook/incoming?msisdn=0547804286&msg=1"
```

אם זה עובד (מחזיר guest_id), אז הבעיה היא ששמות הפרמטרים של 019SMS שונים.

---

## 📝 דוגמא למה שאני צריך לראות:

```
📥 Received SMS webhook (GET)
   All params: {'phoneNumber': '0547804286', 'smsBody': '1', 'timestamp': '2025-12-21T10:30:00'}
   Extracted: from_number=None, message=None
❌ Invalid webhook data: from=None, msg=None
```

במקרה הזה, אני אראה ש-019SMS משתמשים ב-`phoneNumber` ו-`smsBody` במקום `msisdn` ו-`msg`.

---

**לאחר שתשתף את ה-logs, אני אתקן את הקוד להשתמש בשמות הנכונים! 🚀**
