"""
Gmail API Service - Sends emails using Gmail API with OAuth2 Refresh Token
This bypasses SMTP port restrictions on platforms like Render
"""
import os
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


def get_gmail_service():
    """
    Creates and returns a Gmail API service using Refresh Token authentication
    """
    try:
        # Get credentials from environment variables
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")

        if not all([client_id, client_secret, refresh_token]):
            raise ValueError(
                "Missing required environment variables: "
                "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN"
            )

        # Create credentials object
        creds = Credentials(
            None,  # No access token yet
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )

        # Refresh to get a valid access token
        creds.refresh(Request())

        # Build and return the Gmail service
        service = build('gmail', 'v1', credentials=creds)
        return service

    except Exception as e:
        print(f"Error creating Gmail service: {e}")
        raise


def send_email_gmail_api(
    to_email: str,
    subject: str,
    html_content: str,
    logo_path: Optional[str] = None,
    from_email: Optional[str] = None
) -> bool:
    """
    Sends an email using Gmail API

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        logo_path: Optional path to logo image to embed
        from_email: Optional sender email (defaults to authenticated account)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get Gmail service
        service = get_gmail_service()

        # Create message
        message = MIMEMultipart('related')
        message['To'] = to_email
        message['Subject'] = subject

        if from_email:
            message['From'] = from_email

        # Add HTML content
        msg_alternative = MIMEMultipart('alternative')
        message.attach(msg_alternative)

        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg_alternative.attach(html_part)

        # Add logo if provided
        if logo_path and os.path.exists(logo_path):
            try:
                with open(logo_path, 'rb') as f:
                    logo_data = f.read()
                    logo = MIMEImage(logo_data)
                    logo.add_header('Content-ID', '<logo>')
                    logo.add_header('Content-Disposition', 'inline', filename='logo.png')
                    message.attach(logo)
            except Exception as e:
                print(f"Warning: Could not attach logo: {e}")

        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

        # Send email
        send_result = service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()

        print(f"Email sent successfully to {to_email}. Message ID: {send_result['id']}")
        return True

    except HttpError as error:
        print(f"Gmail API HTTP error: {error}")
        return False
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_gmail_connection() -> bool:
    """
    Tests the Gmail API connection

    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        service = get_gmail_service()
        # Try to get the user's profile to verify connection
        profile = service.users().getProfile(userId='me').execute()
        print(f"Gmail API connection successful!")
        print(f"Email: {profile.get('emailAddress')}")
        print(f"Messages Total: {profile.get('messagesTotal')}")
        return True
    except Exception as e:
        print(f"Gmail API connection failed: {e}")
        return False
