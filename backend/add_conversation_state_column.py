"""
הוספת עמודת conversation_state לטבלת guests
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

try:
    print("🔧 מוסיף עמודת conversation_state לטבלת guests...")

    # בדיקה אם העמודה כבר קיימת
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='guests' AND column_name='conversation_state'
    """)

    exists = cur.fetchone()

    if exists:
        print("✅ העמודה conversation_state כבר קיימת!")
    else:
        # הוספת העמודה
        cur.execute("""
            ALTER TABLE guests
            ADD COLUMN conversation_state TEXT DEFAULT 'none'
        """)

        conn.commit()
        print("✅ העמודה conversation_state נוספה בהצלחה!")

    cur.close()
    conn.close()
    print("\n✅ הטבלה מוכנה לשימוש!")

except Exception as e:
    print(f"❌ שגיאה: {e}")
    import traceback
    traceback.print_exc()
    if conn:
        conn.rollback()
        conn.close()
