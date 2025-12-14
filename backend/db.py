import os
import psycopg2
from dotenv import load_dotenv

# טוען את קובץ ה-.env (DB_HOST, DATABASE_URL וכו')
load_dotenv(override=True)

def get_db_connection():
    """
    מחזיר חיבור לדאטהבייס לפי ה-DATABASE_URL מה-.env
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL לא מוגדר ב-.env")
    return psycopg2.connect(db_url)
