import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection
import traceback

try:
    conn = get_db_connection()
    cur = conn.cursor()

    # בדיקה של package_purchases קיים
    cur.execute("SELECT id, user_id, package_id, status FROM package_purchases WHERE status = 'active' LIMIT 1")
    purchase = cur.fetchone()

    if not purchase:
        print("אין חבילות פעילות במערכת")
    else:
        print(f"מצאתי חבילה פעילה: ID={purchase[0]}, User={purchase[1]}, Package={purchase[2]}, Status={purchase[3]}")

        # ניסיון ליצור אירוע
        print("\nמנסה ליצור אירוע...")
        cur.execute("""
            INSERT INTO events (
                user_id, package_purchase_id, event_type, event_title,
                event_date, event_location, invitation_data, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
            RETURNING id, created_at;
        """, (
            purchase[1],  # user_id
            purchase[0],  # package_purchase_id
            'wedding',
            'אירוע בדיקה',
            None,
            None,
            None
        ))

        event = cur.fetchone()
        print(f"✅ האירוע נוצר בהצלחה! ID={event[0]}")

        conn.rollback()  # לא שומרים בפועל

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ שגיאה:")
    print(traceback.format_exc())
