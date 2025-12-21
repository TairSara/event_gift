# הוספת עמודות Status לטבלת Guests

## הבעיה שנמצאה:

הטבלה `guests` חסרה את העמודות הבאות:
- `status` - לסטטוס ההזמנה (pending/tentative/confirmed/declined)
- `attending_count` - מספר מגיעים
- `updated_at` - תאריך עדכון אחרון

בלי העמודות האלה, ה-webhook לא יכול לעדכן את הסטטוס של המוזמנים.

---

## ✅ פתרון - הרצת Migration ב-Render

### אופציה 1: דרך Render Shell (מומלץ)

1. **כנס ל-Render Dashboard:**
   - [https://dashboard.render.com/](https://dashboard.render.com/)

2. **בחר את השירות `event-gift`**

3. **לחץ על "Shell" בתפריט העליון**
   - זה יפתח terminal בתוך השרת של Render

4. **הרץ את הפקודה הבאה:**
   ```bash
   python backend/add_guest_status_columns.py
   ```

5. **אתה אמור לראות:**
   ```
   🔧 Adding status and attending_count columns to guests table...
   ✅ Successfully added status columns to guests table!

   Columns added:
     - status (VARCHAR(20), default: 'pending')
     - attending_count (INTEGER, default: 0)
     - updated_at (TIMESTAMP, default: CURRENT_TIMESTAMP)
   ```

---

### אופציה 2: SQL ישיר (אם Shell לא זמין)

אם אין גישה ל-Shell, אתה יכול להריץ את ה-SQL הזה ישירות ב-database:

```sql
-- Add status column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='guests' AND column_name='status'
    ) THEN
        ALTER TABLE guests
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- Add attending_count column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='guests' AND column_name='attending_count'
    ) THEN
        ALTER TABLE guests
        ADD COLUMN attending_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='guests' AND column_name='updated_at'
    ) THEN
        ALTER TABLE guests
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
```

**איך להריץ SQL ישיר:**
1. כנס ל-Render Dashboard
2. לחץ על **PostgreSQL** database (לא על ה-web service)
3. לחץ על **Connect** → **External Connection**
4. השתמש ב-connection string כדי להתחבר עם כלי כמו pgAdmin או psql
5. הרץ את ה-SQL למעלה

---

## 🧪 בדיקה שהכל עבד:

אחרי שהרצת את ה-migration, בדוק שוב את ה-webhook:

```bash
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

אם זה עובד - ה-webhook מוכן!

---

## 📋 מה קורה אחר כך?

1. **שלח SMS למוזמן** מהמערכת
2. **הגב "1"** מהטלפון שקיבל
3. **תקבל SMS חוזר**: "מעולה! כמה תגיעו?"
4. **הגב "2"** (או כל מספר)
5. **תקבל אישור**: "תודה רבה! רשמנו 2 מגיעים"
6. **הסטטוס במערכת יתעדכן** ל-confirmed עם 2 מגיעים

---

**הכל מוכן! רק צריך להריץ את ה-migration! 🚀**
