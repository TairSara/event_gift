"""
019SMS API Service for sending SMS messages
Documentation: https://docs.019sms.co.il/guide/
"""
import os
import requests
from typing import Dict, List, Optional
from datetime import datetime


class SMS019Service:
    """Service for sending SMS messages via 019SMS API"""

    def __init__(self):
        self.username = os.getenv('SMS_019_USERNAME')
        self.api_token = os.getenv('SMS_019_API_TOKEN')
        self.template_name = os.getenv('SMS_019_TEMPLATE_NAME', 'SAVEDAY_INVITE')
        self.api_url = "https://019sms.co.il/api"

        if not self.username or not self.api_token:
            print("⚠️ WARNING: 019SMS credentials not configured in environment variables")

    def _send_request(self, data: Dict) -> Dict:
        """
        Send request to 019SMS API

        Args:
            data: Request payload (XML or JSON format)

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_token}'
            }

            print(f"📤 Sending SMS API request to: {self.api_url}")
            print(f"📊 Request data: {data}")
            print(f"🔑 Auth header: Bearer {self.api_token[:20]}...")

            response = requests.post(
                self.api_url,
                json=data,
                headers=headers,
                timeout=30
            )

            print(f"📥 Response status: {response.status_code}")
            print(f"📥 Response body: {response.text}")

            if response.status_code == 200:
                try:
                    response_data = response.json()
                except:
                    response_data = {'raw_response': response.text}

                return {
                    'success': True,
                    'data': response_data,
                    'status_code': response.status_code
                }
            else:
                return {
                    'success': False,
                    'error': f'API returned status {response.status_code}',
                    'response_text': response.text,
                    'status_code': response.status_code
                }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timed out after 30 seconds'
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Request failed: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }

    def send_template_sms(
        self,
        destination: str,
        message_text: str,
        source: str = "SaveDay"
    ) -> Dict:
        """
        Send SMS using 019SMS API

        Args:
            destination: Phone number (format: 972501234567 or 0501234567)
            message_text: The SMS message text
            source: Sender name (max 11 chars, alphanumeric only)

        Returns:
            Dict with 'success' boolean and 'data' or 'error'

        Example:
            send_template_sms(
                destination="972501234567",
                message_text="שלום יוסי, אנו שמחים להזמינכם..."
            )
        """
        # Format destination - remove leading 0 if exists, should be 972XXXXXXXX format
        clean_dest = destination.lstrip('0')
        if not clean_dest.startswith('972'):
            clean_dest = '972' + clean_dest

        payload = {
            "username": self.username,
            "source": source[:11],  # Max 11 characters
            "destination": clean_dest,
            "message": message_text
        }

        return self._send_request(payload)

    def send_event_invitation_sms(
        self,
        destination: str,
        greeting: str,
        intro_text: str,
        event_description: str,
        event_date: str,
        event_time: str,
        event_location: str
    ) -> Dict:
        """
        Send event invitation SMS

        Args:
            destination: Phone number in international format (972501234567)
            greeting: Greeting message (e.g., "שלום יוסי")
            intro_text: Introduction text (e.g., "אנו שמחים להזמינכם")
            event_description: Event description
            event_date: Event date (e.g., "25/12/2025")
            event_time: Event time (e.g., "19:00")
            event_location: Event location

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        # Build the message text
        message_parts = [
            greeting,
            intro_text,
            f"ל{event_description}",
            f"בתאריך {event_date} בשעה {event_time}",
            f"מיקום: {event_location}"
        ]

        message_text = "\n".join(message_parts)

        print(f"📱 Preparing SMS invitation:")
        print(f"   To: {destination}")
        print(f"   Message:\n{message_text}")

        return self.send_template_sms(
            destination=destination,
            message_text=message_text
        )

    def send_simple_sms(
        self,
        destination: str,
        message: str,
        source: str = "SaveDay"
    ) -> Dict:
        """
        Send a simple text SMS

        Args:
            destination: Phone number in international format
            message: Text message to send
            source: Sender name (max 11 chars)

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        return self.send_template_sms(
            destination=destination,
            message_text=message,
            source=source
        )


# Global instance
sms_service = SMS019Service()
