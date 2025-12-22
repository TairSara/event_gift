from db import get_db_connection

conn = get_db_connection()
cur = conn.cursor()

# Check guest with ID 10 (from your example)
cur.execute("SELECT id, name, full_name, status, attending_count FROM guests WHERE id = 10")
result = cur.fetchone()

if result:
    print(f"Guest ID: {result[0]}")
    print(f"Name: {result[1]}")
    print(f"Full Name: {result[2]}")
    print(f"Status: {result[3]}")
    print(f"Attending Count: {result[4]}")
else:
    print("Guest not found")

cur.close()
conn.close()
