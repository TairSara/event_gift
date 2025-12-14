import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# מבנה טבלת חבילות
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'packages'
    ORDER BY ordinal_position
""")
print("=== מבנה טבלת packages ===")
for col in cur.fetchall():
    print(f"  {col[0]}: {col[1]}")

# דוגמאות חבילות
cur.execute("SELECT * FROM packages LIMIT 3")
print("\n=== דוגמאות חבילות ===")
for row in cur.fetchall():
    print(row)

# מבנה טבלת package_purchases
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'package_purchases'
    ORDER BY ordinal_position
""")
print("\n=== מבנה טבלת package_purchases ===")
for col in cur.fetchall():
    print(f"  {col[0]}: {col[1]}")

cur.close()
conn.close()
