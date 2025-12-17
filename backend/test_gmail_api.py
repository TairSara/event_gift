"""
Test script for Gmail API email sending
Run this to verify your Gmail API setup is working correctly
"""
import os
from dotenv import load_dotenv
from gmail_api_service import test_gmail_connection, send_email_gmail_api

load_dotenv()

def main():
    print("=" * 60)
    print("Testing Gmail API Configuration")
    print("=" * 60)

    # Check environment variables
    print("\n1. Checking environment variables...")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
    sender_email = os.getenv("SENDER_EMAIL", "savedayevents@gmail.com")

    print(f"   GOOGLE_CLIENT_ID: {'✓ Set' if client_id else '✗ Missing'}")
    print(f"   GOOGLE_CLIENT_SECRET: {'✓ Set' if client_secret else '✗ Missing'}")
    print(f"   GOOGLE_REFRESH_TOKEN: {'✓ Set' if refresh_token else '✗ Missing'}")
    print(f"   SENDER_EMAIL: {sender_email}")

    if not all([client_id, client_secret, refresh_token]):
        print("\n❌ Error: Missing required environment variables!")
        print("Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN")
        return False

    # Test connection
    print("\n2. Testing Gmail API connection...")
    if not test_gmail_connection():
        print("❌ Connection test failed!")
        return False

    # Test sending email
    print("\n3. Testing email sending...")
    test_email = input("Enter email address to send test email to (or press Enter to skip): ").strip()

    if test_email:
        print(f"Sending test email to {test_email}...")
        html_content = """
        <html>
        <body style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
            <h2>בדיקת Gmail API</h2>
            <p>זהו מייל בדיקה מ-SaveDay Events.</p>
            <p>אם קיבלת מייל זה, ה-Gmail API עובד בהצלחה! ✓</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                נשלח באמצעות Gmail API (ללא SMTP)
            </p>
        </body>
        </html>
        """

        success = send_email_gmail_api(
            to_email=test_email,
            subject="בדיקת Gmail API - SaveDay Events",
            html_content=html_content,
            from_email=sender_email
        )

        if success:
            print("✓ Test email sent successfully!")
        else:
            print("✗ Failed to send test email")
            return False

    print("\n" + "=" * 60)
    print("✓ All tests passed! Gmail API is configured correctly.")
    print("=" * 60)
    return True

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
