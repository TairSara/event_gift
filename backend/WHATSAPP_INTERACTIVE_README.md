# WhatsApp Interactive Messages API

מערכת לשליחת הודעות אינטראקטיביות ב-WhatsApp דרך Gupshup API.

## תכונות

- ✅ כפתורי תשובה (Reply Buttons) - עד 3 כפתורים
- ✅ רשימות (List Messages) - עד 10 פריטים
- ✅ בקשת מיקום (Location Request)
- ✅ בקשת כתובת (Address Request)
- ✅ שליחת RSVP לאירועים
- ✅ Webhook לקבלת תשובות

## הגדרות

### משתני סביבה (Environment Variables)

```bash
GUPSHUP_API_KEY=sk_7c99c2f11f284370af9248ce40a4a7d9
GUPSHUP_APP_NAME=saveday
WHATSAPP_SENDER_NUMBER=972525869312
```

### Webhook URL
```
https://event-gift.onrender.com/api/whatsapp/webhook/gupshup
```

## API Endpoints

### 1. שליחת כפתורי RSVP לאורח

**POST** `/api/whatsapp/send-event-rsvp`

```json
{
  "guest_id": 123,
  "event_id": 456
}
```

**תגובה מוצלחת:**
```json
{
  "success": true,
  "guest_name": "שם האורח",
  "phone": "+972501234567",
  "message_data": {
    "status": "submitted",
    "messageId": "uuid-here"
  }
}
```

### 2. שליחת RSVP לכל האורחים

**POST** `/api/whatsapp/send-bulk-rsvp/{event_id}`

```json
{
  "total": 10,
  "successful": 9,
  "failed": 1,
  "results": [...]
}
```

### 3. שליחת כפתורים מותאמים אישית

**POST** `/api/whatsapp/send-buttons`

```json
{
  "destination": "+972501234567",
  "body": "האם תרצה להזמין מתנה?",
  "buttons": [
    {"id": "yes", "title": "כן"},
    {"id": "no", "title": "לא"},
    {"id": "later", "title": "אחר כך"}
  ],
  "header": "מערכת מתנות",
  "footer": "תודה!"
}
```

### 4. שליחת רשימה

**POST** `/api/whatsapp/send-list`

```json
{
  "destination": "+972501234567",
  "header": "בחר חבילה",
  "body": "אנא בחר את החבילה המתאימה לך",
  "footer": "תודה!",
  "button_text": "בחר חבילה",
  "sections": [
    {
      "title": "חבילות פופולריות",
      "rows": [
        {
          "id": "basic",
          "title": "חבילה בסיסית",
          "description": "299 ש\"ח - עד 50 מוזמנים"
        },
        {
          "id": "premium",
          "title": "חבילה פרימיום",
          "description": "499 ש\"ח - עד 100 מוזמנים"
        }
      ]
    }
  ]
}
```

### 5. בקשת מיקום

**POST** `/api/whatsapp/send-location-request`

```json
{
  "destination": "+972501234567",
  "body": "נא לשתף את המיקום שלך לצורך משלוח"
}
```

### 6. בקשת כתובת

**POST** `/api/whatsapp/send-address-request`

```json
{
  "destination": "+972501234567",
  "body": "נא למלא את כתובת המשלוח",
  "country": "IL",
  "header": "כתובת משלוח",
  "footer": "תודה!",
  "pre_filled_values": {
    "name": "שם הלקוח",
    "phoneNumber": "+972501234567"
  }
}
```

## Webhook - קבלת תשובות

כאשר משתמש מגיב להודעה אינטראקטיבית, Gupshup שולח webhook ל:

**POST** `/api/whatsapp/webhook/gupshup`

### דוגמאות Webhook Payload

#### תשובה לכפתור (RSVP)
```json
{
  "type": "message",
  "payload": {
    "type": "button_reply",
    "payload": {
      "id": "rsvp_yes",
      "title": "אגיע בשמחה"
    },
    "sender": {
      "phone": "972501234567"
    }
  }
}
```

המערכת אוטומטית מעדכנת את סטטוס האורח ב-DB:
- `rsvp_yes` → `attendance_status = 'confirmed'`
- `rsvp_maybe` → `attendance_status = 'maybe'`
- `rsvp_no` → `attendance_status = 'declined'`

#### שיתוף מיקום
```json
{
  "type": "message",
  "payload": {
    "type": "location",
    "payload": {
      "name": "שם המקום",
      "longitude": "34.7818",
      "latitude": "32.0853",
      "address": "תל אביב"
    }
  }
}
```

#### שיתוף כתובת
```json
{
  "type": "message",
  "payload": {
    "type": "nfm_reply",
    "payload": {
      "addressDetails": {
        "name": "שם",
        "phone_number": "+972501234567",
        "address": "רחוב 123",
        "city": "תל אביב"
      }
    }
  }
}
```

## דוגמאות שימוש

### JavaScript/Frontend

```javascript
// שליחת RSVP לאורח בודד
async function sendRSVP(guestId, eventId) {
  const response = await fetch('/api/whatsapp/send-event-rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_id: guestId, event_id: eventId })
  });
  return await response.json();
}

// שליחת RSVP לכל האורחים
async function sendBulkRSVP(eventId) {
  const response = await fetch(`/api/whatsapp/send-bulk-rsvp/${eventId}`, {
    method: 'POST'
  });
  return await response.json();
}
```

### Python

```python
import requests

# שליחת כפתורים
def send_buttons(destination, body, buttons):
    response = requests.post('http://localhost:8001/api/whatsapp/send-buttons', json={
        'destination': destination,
        'body': body,
        'buttons': buttons
    })
    return response.json()

# דוגמה
result = send_buttons(
    destination='+972501234567',
    body='האם תגיע לאירוע?',
    buttons=[
        {'id': 'yes', 'title': 'כן'},
        {'id': 'no', 'title': 'לא'}
    ]
)
print(result)
```

## הגבלות וכללים

### כפתורי תשובה (Reply Buttons)
- מקסימום 3 כפתורים
- ניתן לשלוח רק בתוך 24 שעות מההודעה האחרונה של המשתמש
- המשתמש יכול ללחוץ רק על כפתור אחד

### רשימות (Lists)
- מקסימום 10 פריטים
- מקסימום 10 sections
- ניתן לשלוח רק בתוך 24 שעות מההודעה האחרונה של המשתמש

### כתובות (Address Messages)
- ⚠️ נתמך באופן רשמי רק בהודו (IN) וסינגפור (SG)
- ישראל (IL) - ייתכן שיפעל אך לא מובטח

## Troubleshooting

### שגיאה: "Authentication Failed"
בדוק שה-API Key תקין ב-environment variables

### שגיאה: "24 hour window expired"
הודעות אינטראקטיביות ניתן לשלוח רק בתוך 24 שעות מההודעה האחרונה של המשתמש.
פתרון: שלח template message מאושר קודם.

### ההודעה לא מגיעה
1. ודא שמספר הטלפון כולל קידומת מדינה (+972)
2. בדוק שהמספר רשום ב-WhatsApp
3. בדוק logs ב-Gupshup dashboard

## קישורים שימושיים

- [Gupshup Interactive Messages Docs](https://docs.gupshup.io/docs/interactive-messages)
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Gupshup Dashboard](https://www.gupshup.io/developer/dashboard)

## תמיכה

לשאלות ובעיות, פנה למפתח או צור issue ב-GitHub.
