import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# בדיקת מבנה טבלת admins
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'admins'
    ORDER BY ordinal_position;
""")

columns = cur.fetchall()
print("Admins table structure:")
for col in columns:
    nullable = 'NULL' if col[2] == 'YES' else 'NOT NULL'
    default = f" DEFAULT {col[3]}" if col[3] else ""
    print(f"  - {col[0]} ({col[1]}) {nullable}{default}")

cur.close()
conn.close()
