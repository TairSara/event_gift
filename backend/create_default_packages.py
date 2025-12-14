"""
יצירת חבילות ברירת מחדל במערכת
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

def create_default_packages():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("🎁 יצירת חבילות ברירת מחדל...\n")

        # מחיקת חבילות קיימות (למען הבטיחות)
        cur.execute("DELETE FROM packages")

        packages = [
            {
                "name": "חבילת בסיס",
                "price": 0,
                "description": "חבילה בסיסית ללא עלות",
                "features": ["עד 50 מוזמנים", "אירוע אחד", "ניהול רשימת מוזמנים בסיסי"],
                "max_guests": 50,
                "is_active": True
            },
            {
                "name": "חבילת כסף",
                "price": 299,
                "description": "חבילה מושלמת לאירועים קטנים-בינוניים",
                "features": ["עד 150 מוזמנים", "3 אירועים", "שליחת הזמנות WhatsApp", "ניהול אישורי הגעה", "מעקב מתנות"],
                "max_guests": 150,
                "is_active": True
            },
            {
                "name": "חבילת זהב",
                "price": 599,
                "description": "חבילה מקצועית לאירועים גדולים",
                "features": ["עד 500 מוזמנים", "אירועים ללא הגבלה", "שליחת הזמנות WhatsApp + SMS", "ניהול שולחנות", "מעקב מתנות", "דוחות מפורטים"],
                "max_guests": 500,
                "is_active": True
            },
            {
                "name": "חבילת פרימיום",
                "price": 999,
                "description": "החבילה המקיפה ביותר",
                "features": ["מוזמנים ללא הגבלה", "אירועים ללא הגבלה", "כל התכונות", "תמיכה VIP", "התאמה אישית", "ייצוא נתונים"],
                "max_guests": 999999,  # ללא הגבלה בפועל
                "is_active": True
            }
        ]

        for pkg in packages:
            cur.execute("""
                INSERT INTO packages (name, price, description, features, max_guests, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, name, price, max_guests
            """, (
                pkg["name"],
                pkg["price"],
                pkg["description"],
                pkg["features"],
                pkg["max_guests"],
                pkg["is_active"]
            ))

            result = cur.fetchone()
            print(f"✅ {result[1]}")
            print(f"   מחיר: ₪{result[2]}")
            print(f"   מקסימום אורחים: {result[3]}")
            print()

        conn.commit()
        cur.close()
        conn.close()

        print("🎉 כל החבילות נוצרו בהצלחה!")

    except Exception as e:
        print(f"❌ שגיאה: {e}")
        if conn:
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    create_default_packages()
