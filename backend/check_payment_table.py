"""
בדיקת שדות תשלום בטבלת package_purchases
"""
from db import get_db_connection

def check_payment_columns():
    """בדיקה האם שדות התשלום קיימים בטבלה"""
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # שליפת כל העמודות בטבלה
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'package_purchases'
            ORDER BY ordinal_position;
        """)

        columns = cur.fetchall()

        print("\n" + "="*70)
        print("עמודות בטבלת package_purchases:")
        print("="*70)

        payment_columns = [
            'payment_status',
            'payment_amount',
            'payment_currency',
            'tranzila_transaction_id',
            'tranzila_reference',
            'payment_method',
            'payment_date',
            'payment_response'
        ]

        existing_payment_cols = []

        for col in columns:
            column_name = col[0]
            data_type = col[1]
            nullable = "NULL" if col[2] == "YES" else "NOT NULL"

            is_payment_col = column_name in payment_columns
            marker = "✓" if is_payment_col else " "

            print(f"{marker} {column_name:30} {data_type:20} {nullable}")

            if is_payment_col:
                existing_payment_cols.append(column_name)

        print("="*70)
        print(f"\nשדות תשלום שנמצאו: {len(existing_payment_cols)}/{len(payment_columns)}")

        if len(existing_payment_cols) == len(payment_columns):
            print("✅ כל שדות התשלום קיימים!")
            return True
        else:
            missing = set(payment_columns) - set(existing_payment_cols)
            print(f"❌ שדות חסרים: {', '.join(missing)}")
            return False

    except Exception as e:
        print(f"❌ שגיאה בבדיקת הטבלה: {e}")
        return False
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    check_payment_columns()
