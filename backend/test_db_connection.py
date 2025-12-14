import os
import sys
import psycopg2

# טוען .env טרי
from dotenv import load_dotenv
load_dotenv(override=True)  # override=True כדי לדרוס משתנים קיימים

db_url = os.getenv("DATABASE_URL")
print(f"DATABASE_URL from env: {db_url}")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT 1;")
    result = cur.fetchone()
    cur.close()
    conn.close()
    print("✅ Connection successful!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)
