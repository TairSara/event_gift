from dotenv import load_dotenv
import os
import psycopg2
import json

load_dotenv()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set in .env")
    return psycopg2.connect(db_url)

def seed_packages():
    conn = get_db_connection()
    cur = conn.cursor()

    # בדיקה אם כבר יש חבילות במערכת
    cur.execute("SELECT COUNT(*) FROM packages;")
    count = cur.fetchone()[0]

    if count > 0:
        print(f"Packages already exist ({count} packages). Skipping seed.")
        cur.close()
        conn.close()
        return

    packages = [
        {
            "name": "חבילה בסיסית",
            "tagline": "מושלם לאירועים קטנים ואינטימיים",
            "price": "1 ₪",
            "price_unit": "לרשומה",
            "color": "turquoise",
            "popular": False,
            "features": json.dumps([
                {"text": "שליחת תמונה או סרטון מרהיבים עם ההזמנה בוואטסאפ", "included": True},
                {"text": "שני סיבובי וואטסאפ ו-SMS חכמים", "included": True},
                {"text": "תזכורת SMS ביום האירוע + ניווט ווייז ישיר", "included": True},
                {"text": "עיצוב הזמנה דיגיטלית מדהימה לחלוטין בחינם", "included": True},
                {"text": "מערכת ניהול חכמה עם דשבורד אישי", "included": True},
                {"text": "קישור לשליחה ידנית בקבוצות", "included": True},
                {"text": "מספרי שולחנות אוטומטיים בהודעת התזכורת", "included": True},
                {"text": "אפשרות קבלת מתנות באשראי", "included": True}
            ]),
            "note": "ללא הגבלת מוזמנים - כמה שתרצו!"
        },
        {
            "name": "חבילה בינונית",
            "tagline": "שילוב מושלם של איכות ומחיר הוגן!",
            "price": "180 ₪",
            "price_unit": "עד 300 איש",
            "color": "sage",
            "popular": False,
            "features": json.dumps([
                {"text": "שני סיבובי וואטסאפ ו-SMS אוטומטיים", "included": True},
                {"text": "שלושה סבבי שיחות טלפוניות אישיות", "included": True},
                {"text": "עיצוב הזמנה דיגיטלית מהממת לחלוטין בחינם", "included": True},
                {"text": "שליחת תמונה או סרטון אישי בוואטסאפ", "included": True},
                {"text": "תזכורת חכמה ביום האירוע + ניווט ווייז", "included": True},
                {"text": "מערכת ניהול פרימיום עם דשבורד מתקדם", "included": True},
                {"text": "קישור ידני לקבוצות וואטסאפ", "included": True},
                {"text": "מערכת מתנות באשראי משוכללת", "included": True},
                {"text": "הודעות תודה אוטומטיות למחרת", "included": True},
                {"text": "שיבוץ שולחנות אוטומטי בתזכורת", "included": True}
            ]),
            "note": "החבילה המומלצת - כולל הכל מה שצריך!"
        },
        {
            "name": "חבילה כלכלית",
            "tagline": "הפתרון החכם - מקסימום ערך במינימום עלות!",
            "price": "1.6 ₪",
            "price_unit": "לרשומה",
            "color": "gold",
            "popular": False,
            "features": json.dumps([
                {"text": "שני סיבובי וואטסאפ ו-SMS מקצועיים", "included": True},
                {"text": "שלושה סבבי שיחות טלפוניות", "included": True},
                {"text": "עיצוב הזמנה דיגיטלית מושלמת בחינם", "included": True},
                {"text": "שליחת תמונה או סרטון מותאם אישית", "included": True},
                {"text": "תזכורת מתוזמנת ביום האירוע + ווייז", "included": True},
                {"text": "מערכת ניהול מתקדמת עם דשבורד", "included": True},
                {"text": "קישור לשיתוף חופשי בקבוצות", "included": True},
                {"text": "הודעות תודה אוטומטיות למחרת", "included": True},
                {"text": "שיבוץ שולחנות חכם", "included": True},
                {"text": "מתנות באשראי", "included": False}
            ]),
            "note": "הכי הרבה תמורה לכסף - כל הפיצ'רים ללא מתנות באשראי"
        },
        {
            "name": "חבילה מלאה",
            "tagline": "שגר ושכח - אנחנו דואגים לכל הפרטים!",
            "price": "250 ₪",
            "price_unit": "ללא הגבלת אורחים",
            "color": "rose",
            "popular": True,
            "features": json.dumps([
                {"text": "שני סיבובי וואטסאפ ו-SMS מתוזמנים", "included": True},
                {"text": "שלושה סבבי שיחות מקצועיות", "included": True},
                {"text": "עיצוב הזמנה דיגיטלית ייחודית בחינם", "included": True},
                {"text": "שליחת תמונה או סרטון מרגש בוואטסאפ", "included": True},
                {"text": "תזכורת אינטליגנטית ביום האירוע + ווייז", "included": True},
                {"text": "מערכת ניהול VIP מקצועית", "included": True},
                {"text": "קישור בלתי מוגבל לשיתוף", "included": True},
                {"text": "מערכת מתנות פרימיום באשראי", "included": True},
                {"text": "הודעות תודה מעוצבות למחרת האירוע", "included": True},
                {"text": "שיבוץ שולחנות חכם", "included": True}
            ]),
            "note": "לאירועים גדולים - אין מגבלות, רק הצלחה!"
        }
    ]

    for pkg in packages:
        cur.execute("""
            INSERT INTO packages (name, tagline, price, price_unit, color, popular, features, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            pkg["name"],
            pkg["tagline"],
            pkg["price"],
            pkg["price_unit"],
            pkg["color"],
            pkg["popular"],
            pkg["features"],
            pkg["note"]
        ))

    conn.commit()
    cur.close()
    conn.close()
    print("OK - Packages seeded successfully!")

if __name__ == "__main__":
    seed_packages()
