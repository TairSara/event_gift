import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(override=True)

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL לא מוגדר ב-.env")

    # אם כבר הוספת ?sslmode=require ל-URL זה מספיק,
    # אבל גם ככה לא מזיק להשאיר כאן require.
    return psycopg2.connect(
        db_url,
        sslmode="require",
        connect_timeout=10
    )
