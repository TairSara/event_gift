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

    def _send_request(self, endpoint: str, data: Dict) -> Dict:
        """
        Send request to 019SMS API

        Args:
            endpoint: API endpoint path
            data: Request payload

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_token}'
            }

            print(f"📤 Sending SMS API request to: {self.api_url}{endpoint}")
            print(f"📊 Request data: {data}")

            response = requests.post(
                f"{self.api_url}{endpoint}",
                json=data,
                headers=headers,
                timeout=30
            )

            print(f"📥 Response status: {response.status_code}")
            print(f"📥 Response body: {response.text}")

            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json() if response.text else {},
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
        template_params: List[str],
        template_name: Optional[str] = None
    ) -> Dict:
        """
        Send SMS using a predefined template

        Args:
            destination: Phone number (format: 972501234567)
            template_params: List of parameters for the template (in order)
            template_name: Optional template name (uses default if not provided)

        Returns:
            Dict with 'success' boolean and 'data' or 'error'

        Example:
            send_template_sms(
                destination="972501234567",
                template_params=["שלום", "אנו שמחים להזמינכם", "אירוע מיוחד", "25/12/2025", "19:00", "אולם האירועים"]
            )
        """
        template = template_name or self.template_name

        payload = {
            "username": self.username,
            "destination": destination,
            "template": template,
            "params": template_params
        }

        return self._send_request("/send-template", payload)

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
        Send event invitation SMS using the template

        Based on your template structure:
        [שדה דינמי 1] - Greeting (שלום)
        [שדה דינמי 2] - Intro text (אנו שמחים להזמינכם)
        [שדה דינמי 3] - Event description (תיאור האירוע)
        [שדה דינמי 4] - Event date & time (25/12/2025 בשעה 19:00)
        [שדה דינמי 5] - Location (מקום האירוע)

        Args:
            destination: Phone number in international format (972501234567)
            greeting: Greeting message (e.g., "שלום [שם]")
            intro_text: Introduction text (e.g., "אנו שמחים להזמינכם")
            event_description: Event description
            event_date: Event date (e.g., "25/12/2025")
            event_time: Event time (e.g., "19:00")
            event_location: Event location

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        # Combine date and time for parameter 4
        date_time_combined = f"{event_date} בשעה {event_time}"

        template_params = [
            greeting,           # שדה דינמי 1
            intro_text,         # שדה דינמי 2
            event_description,  # שדה דינמי 3
            date_time_combined, # שדה דינמי 4
            event_location      # שדה דינמי 5
        ]

        print(f"📱 Preparing SMS invitation:")
        print(f"   To: {destination}")
        print(f"   Template params: {template_params}")

        return self.send_template_sms(
            destination=destination,
            template_params=template_params
        )

    def send_simple_sms(
        self,
        destination: str,
        message: str
    ) -> Dict:
        """
        Send a simple text SMS (non-template)
        Note: Check if your 019SMS plan supports non-template messages

        Args:
            destination: Phone number in international format
            message: Text message to send

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        payload = {
            "username": self.username,
            "destination": destination,
            "message": message
        }

        return self._send_request("/send", payload)


# Global instance
sms_service = SMS019Service()
