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
            data: Request payload (JSON format)

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

                    # Check if API returned success status (status == 0 means success)
                    api_status = response_data.get('status')
                    if api_status == 0:
                        return {
                            'success': True,
                            'data': response_data,
                            'status_code': response.status_code
                        }
                    else:
                        # API returned error status
                        error_message = response_data.get('message', 'Unknown API error')
                        return {
                            'success': False,
                            'error': f'API error (status {api_status}): {error_message}',
                            'response_data': response_data,
                            'status_code': response.status_code
                        }
                except:
                    response_data = {'raw_response': response.text}
                    return {
                        'success': False,
                        'error': 'Failed to parse API response',
                        'response_text': response.text,
                        'status_code': response.status_code
                    }
            else:
                return {
                    'success': False,
                    'error': f'API returned HTTP status {response.status_code}',
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
        source: str = "invite2you"
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
        # Format destination for 019SMS API
        # API expects Israeli local format: 5xxxxxxx or 05xxxxxxx (not international 972xxx)
        digits_only = ''.join(filter(str.isdigit, destination))

        # Remove country code if present
        if digits_only.startswith('972'):
            # Remove 972 and add leading 0
            clean_dest = '0' + digits_only[3:]
        elif digits_only.startswith('0'):
            # Already in correct format
            clean_dest = digits_only
        else:
            # Assume it's missing the leading 0
            clean_dest = '0' + digits_only

        # Build payload according to official 019SMS API documentation
        # The entire payload must be wrapped in 'sms' key
        payload = {
            "sms": {
                "user": {
                    "username": self.username
                },
                "source": source[:11],  # Max 11 characters, alphanumeric sender ID
                "destinations": {
                    "phone": [clean_dest]  # Array of phone number strings
                },
                "message": message_text
            }
        }

        return self._send_request(payload)

    def send_event_invitation_sms(
        self,
        destination: str,
        event_name: str,
        rsvp_link: str
    ) -> Dict:
        """
        Send event invitation SMS with RSVP link

        Args:
            destination: Phone number in international format (972501234567)
            event_name: Event name (e.g., "חתונה של דוד ורות")
            rsvp_link: Link to RSVP page

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        # Build the message text with link
        message_text = f"הנכם מוזמנים ל{event_name}, נשמח שתאשרו הגעתכם בלינק הבא: {rsvp_link}"

        print(f"📱 Preparing SMS invitation:")
        print(f"   To: {destination}")
        print(f"   Message: {message_text}")

        return self.send_template_sms(
            destination=destination,
            message_text=message_text
        )

    def send_simple_sms(
        self,
        destination: str,
        message: str,
        source: str = "invite2you"
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

    def send_bulk_sms(
        self,
        messages: List[Dict[str, str]],
        source: str = "invite2you"
    ) -> Dict:
        """
        Send multiple SMS messages in a single API call using 019SMS bulk API

        Args:
            messages: List of dicts with 'destination' and 'message' keys
                Example: [
                    {"destination": "0501234567", "message": "שלום..."},
                    {"destination": "0509876543", "message": "שלום..."}
                ]
            source: Sender name (max 11 chars)

        Returns:
            Dict with 'success' boolean and 'data' or 'error'
        """
        # Format all phone numbers
        formatted_messages = []
        for msg in messages:
            digits_only = ''.join(filter(str.isdigit, msg['destination']))

            # Remove country code if present
            if digits_only.startswith('972'):
                clean_dest = '0' + digits_only[3:]
            elif digits_only.startswith('0'):
                clean_dest = digits_only
            else:
                clean_dest = '0' + digits_only

            formatted_messages.append({
                "phone": clean_dest,
                "message": msg['message']
            })

        # Build bulk payload according to 019SMS API documentation
        payload = {
            "bulk": {
                "user": {
                    "username": self.username
                },
                "source": source[:11],
                "messages": formatted_messages
            }
        }

        return self._send_request(payload)


# Global instance
sms_service = SMS019Service()
