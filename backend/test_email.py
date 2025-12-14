"""
סקריפט לבדיקת שליחת מיילים
הרץ את זה כדי לוודא שהמערכת עובדת
"""
from email_service import send_welcome_email, send_reset_code_email, send_password_reset_success_email

def test_welcome_email():
    """בדיקת מייל ברוכים הבאים"""
    print("Testing welcome email...")
    result = send_welcome_email("test@example.com", "משתמש בדיקה")
    if result:
        print("✅ Welcome email sent successfully!")
    else:
        print("❌ Failed to send welcome email")
    return result

def test_reset_code_email():
    """בדיקת מייל קוד איפוס"""
    print("\nTesting reset code email...")
    result = send_reset_code_email("test@example.com", "123456")
    if result:
        print("✅ Reset code email sent successfully!")
    else:
        print("❌ Failed to send reset code email")
    return result

def test_success_email():
    """בדיקת מייל אישור איפוס"""
    print("\nTesting password reset success email...")
    result = send_password_reset_success_email("test@example.com", "משתמש בדיקה")
    if result:
        print("✅ Success email sent successfully!")
    else:
        print("❌ Failed to send success email")
    return result

if __name__ == "__main__":
    print("=" * 50)
    print("Email Service Test")
    print("=" * 50)

    # בדיקה - שנה את האימייל לאימייל שלך לבדיקה
    test_email = input("\nEnter your email for testing (or press Enter to skip): ").strip()

    if test_email:
        print(f"\nSending test emails to: {test_email}")

        # תוכל לבחור איזו בדיקה להריץ
        choice = input("\nWhich test? (1=Welcome, 2=Reset Code, 3=Success, 4=All): ").strip()

        if choice == "1":
            send_welcome_email(test_email, "משתמש בדיקה")
        elif choice == "2":
            send_reset_code_email(test_email, "123456")
        elif choice == "3":
            send_password_reset_success_email(test_email, "משתמש בדיקה")
        elif choice == "4":
            send_welcome_email(test_email, "משתמש בדיקה")
            send_reset_code_email(test_email, "123456")
            send_password_reset_success_email(test_email, "משתמש בדיקה")
        else:
            print("Invalid choice")
    else:
        print("\nSkipping email test")

    print("\n" + "=" * 50)
    print("Test completed!")
    print("=" * 50)
