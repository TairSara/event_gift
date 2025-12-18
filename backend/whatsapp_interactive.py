"""
WhatsApp Interactive Messages Service using Gupshup API
Supports: List Messages, Reply Buttons, Location Requests, Address Messages
"""
import os
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

# Gupshup API Configuration
GUPSHUP_API_KEY = os.getenv('GUPSHUP_API_KEY', 'sk_7c99c2f11f284370af9248ce40a4a7d9')
GUPSHUP_APP_NAME = os.getenv('GUPSHUP_APP_NAME', 'saveday')
WHATSAPP_SENDER_NUMBER = os.getenv('WHATSAPP_SENDER_NUMBER', '972525869312')
WHATSAPP_TEMPLATE_NAME = os.getenv('WHATSAPP_TEMPLATE_NAME', 'event_invitation_new')
DEFAULT_INVITATION_IMAGE = os.getenv('DEFAULT_INVITATION_IMAGE', 'https://i.ibb.co/pKDqkh5/default-invitation.jpg')
GUPSHUP_API_URL = 'https://api.gupshup.io/wa/api/v1/msg'
GUPSHUP_TEMPLATE_URL = 'https://api.gupshup.io/wa/api/v1/template/msg'


class WhatsAppInteractiveService:
    """Service for sending WhatsApp interactive messages via Gupshup"""

    def __init__(self):
        self.api_key = GUPSHUP_API_KEY
        self.app_name = GUPSHUP_APP_NAME
        self.sender_number = WHATSAPP_SENDER_NUMBER
        self.api_url = GUPSHUP_API_URL

    def _send_message(self, destination: str, message_payload: Dict) -> Dict:
        """
        Send message to Gupshup API

        Args:
            destination: Recipient phone number (with country code)
            message_payload: Message payload dict

        Returns:
            API response dict
        """
        headers = {
            'apikey': self.api_key,
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        data = {
            'channel': 'whatsapp',
            'source': self.sender_number,
            'destination': destination,
            'src.name': self.app_name,
            'message': json.dumps(message_payload)
        }

        try:
            response = requests.post(self.api_url, headers=headers, data=data)

            print(f"\n📥 Gupshup Response:")
            print(f"   Status Code: {response.status_code}")
            print(f"   Response Body: {response.text}")

            response.raise_for_status()

            # Parse JSON response
            result = response.json()

            # Gupshup can return 200 with an error in the response body
            if 'status' in result and result['status'] == 'error':
                error_msg = result.get('message', 'Unknown error from Gupshup')
                print(f"❌ Gupshup API Error: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'status_code': response.status_code,
                    'response_text': response.text
                }

            # Check if we have a message ID
            if 'messageId' not in result:
                error_msg = result.get('message', 'No message ID returned')
                print(f"⚠️ Gupshup Warning: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'status_code': response.status_code,
                    'response_text': response.text
                }

            print(f"✅ Message sent successfully, ID: {result.get('messageId')}")

            return {
                'success': True,
                'data': result,
                'status_code': response.status_code
            }
        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            status_code = getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
            response_text = getattr(e.response, 'text', '') if hasattr(e, 'response') else ''

            print(f"❌ Gupshup Error: {error_msg}")
            print(f"   Status Code: {status_code}")
            print(f"   Response: {response_text}")

            return {
                'success': False,
                'error': error_msg,
                'status_code': status_code,
                'response_text': response_text
            }

    def send_list_message(
        self,
        destination: str,
        header: str,
        body: str,
        footer: str,
        button_text: str,
        sections: List[Dict]
    ) -> Dict:
        """
        Send a list message with up to 10 items

        Args:
            destination: Recipient phone number
            header: Message header text
            body: Message body text
            footer: Message footer text
            button_text: Text for the list button
            sections: List of sections, each with title and rows

        Example sections:
        [
            {
                "title": "Section 1",
                "rows": [
                    {"id": "1", "title": "Option 1", "description": "Description 1"},
                    {"id": "2", "title": "Option 2", "description": "Description 2"}
                ]
            }
        ]
        """
        message_payload = {
            "type": "list",
            "header": {"text": header},
            "body": {"text": body},
            "footer": {"text": footer},
            "action": {
                "button": button_text,
                "sections": sections
            }
        }

        return self._send_message(destination, message_payload)

    def send_reply_buttons(
        self,
        destination: str,
        body: str,
        buttons: List[Dict],
        header: Optional[str] = None,
        footer: Optional[str] = None
    ) -> Dict:
        """
        Send a message with up to 3 reply buttons

        Args:
            destination: Recipient phone number
            body: Message body text
            buttons: List of up to 3 buttons
            header: Optional header text
            footer: Optional footer text

        Example buttons:
        [
            {"id": "btn1", "title": "Yes"},
            {"id": "btn2", "title": "No"},
            {"id": "btn3", "title": "Maybe"}
        ]
        """
        message_payload = {
            "type": "button",
            "body": {"text": body},
            "action": {"buttons": buttons}
        }

        if header:
            message_payload["header"] = {"text": header}
        if footer:
            message_payload["footer"] = {"text": footer}

        return self._send_message(destination, message_payload)

    def send_location_request(
        self,
        destination: str,
        body: str
    ) -> Dict:
        """
        Send a location request message

        Args:
            destination: Recipient phone number
            body: Message body text asking for location
        """
        message_payload = {
            "type": "location_request_message",
            "body": {"text": body},
            "action": {"name": "send_location"}
        }

        return self._send_message(destination, message_payload)

    def send_address_request(
        self,
        destination: str,
        body: str,
        country: str = "IL",
        header: Optional[str] = None,
        footer: Optional[str] = None,
        pre_filled_values: Optional[Dict] = None,
        saved_addresses: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send an address request message (India and Singapore only in production)

        Args:
            destination: Recipient phone number
            body: Message body text
            country: Country code (IL for Israel, IN for India, SG for Singapore)
            header: Optional header text
            footer: Optional footer text
            pre_filled_values: Pre-filled address values
            saved_addresses: List of saved addresses to show

        Note: Address messages are officially supported only for India (IN) and Singapore (SG)
        """
        message_payload = {
            "type": "address_message",
            "body": {"text": body},
            "address": {
                "country": country,
                "values": pre_filled_values or {}
            }
        }

        if header:
            message_payload["header"] = {"text": header}
        if footer:
            message_payload["footer"] = {"text": footer}
        if saved_addresses:
            message_payload["address"]["savedAddresses"] = saved_addresses

        return self._send_message(destination, message_payload)

    def send_event_rsvp_buttons(
        self,
        destination: str,
        guest_name: str,
        event_name: str,
        event_date: str,
        event_location: str
    ) -> Dict:
        """
        Send RSVP buttons for an event invitation

        Args:
            destination: Guest phone number
            guest_name: Name of the guest
            event_name: Name of the event
            event_date: Date of the event
            event_location: Location of the event
        """
        body = f"""היי {guest_name}! 👋

אנחנו שמחים להזמין אותך ל{event_name}

📅 תאריך: {event_date}
📍 מקום: {event_location}

נשמח לדעת אם תוכל/י להגיע!"""

        buttons = [
            {"id": "rsvp_yes", "title": "✅ אגיע בשמחה"},
            {"id": "rsvp_maybe", "title": "🤔 אולי"},
            {"id": "rsvp_no", "title": "❌ לא אוכל"}
        ]

        return self.send_reply_buttons(
            destination=destination,
            body=body,
            buttons=buttons,
            footer="תודה! 💝"
        )

    def send_template_message(
        self,
        destination: str,
        template_name: str,
        template_params: List[str],
        image_url: Optional[str] = None
    ) -> Dict:
        """
        Send a WhatsApp template message with optional image attachment

        Args:
            destination: Recipient phone number (with country code)
            template_name: Name of the approved template
            template_params: List of parameters to fill in the template (text params ONLY)
            image_url: Optional URL to an image for Media templates (sent separately in attachments)

        Example:
            send_template_message(
                destination="+972501234567",
                template_name="event_invitation_new",
                template_params=["שם האורח", "שם האירוע", "01/01/2025", "18:00", "מקום האירוע", "חתימה"],
                image_url="https://example.com/invitation.jpg"
            )
        """
        headers = {
            'apikey': self.api_key,
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        # Clean image URL - remove query parameters that WhatsApp rejects
        clean_image_url = None
        if image_url:
            clean_image_url = image_url.split('?')[0] if '?' in image_url else image_url
            if clean_image_url != image_url:
                print(f"🧹 Cleaned image URL: {image_url} -> {clean_image_url}")

        # Build template payload - Gupshup specific format
        # Template object contains ID and text params ONLY
        template_data = {
            "id": template_name,
            "params": template_params
        }

        # Build the data payload
        data = {
            'channel': 'whatsapp',
            'source': self.sender_number,
            'destination': destination,
            'src.name': self.app_name,
            'template': json.dumps(template_data)
        }

        # For Media templates, add SEPARATE message object with image
        # This is Gupshup's specific format - NOT part of template object!
        if clean_image_url:
            message_data = {
                "type": "image",
                "image": {
                    "link": clean_image_url
                }
            }
            data['message'] = json.dumps(message_data)

        print(f"\n📤 Sending template message to Gupshup:")
        print(f"   URL: {GUPSHUP_TEMPLATE_URL}")
        print(f"   Destination: {destination}")
        print(f"   Template: {template_name}")
        print(f"   Text Params: {len(template_params)}")
        print(f"   Template JSON: {data['template']}")
        if clean_image_url:
            print(f"   Image (separate): {data.get('message', 'N/A')}")
        print(f"   Full Data payload keys: {list(data.keys())}")

        try:
            response = requests.post(GUPSHUP_TEMPLATE_URL, headers=headers, data=data)

            print(f"\n📥 Gupshup Response:")
            print(f"   Status Code: {response.status_code}")
            print(f"   Response Body: {response.text}")

            # Check if HTTP status is OK
            response.raise_for_status()

            # Parse JSON response
            result = response.json()

            # Gupshup can return 200 with an error in the response body
            # Check for common error indicators
            if 'status' in result and result['status'] == 'error':
                error_msg = result.get('message', 'Unknown error from Gupshup')
                print(f"\n❌ Gupshup API Error:")
                print(f"   Error Message: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'status_code': response.status_code,
                    'response_text': response.text
                }

            # Check if we have a message ID (success indicator)
            if 'messageId' not in result:
                error_msg = result.get('message', 'No message ID returned - message may not have been sent')
                print(f"\n⚠️ Gupshup Warning:")
                print(f"   {error_msg}")
                print(f"   Full response: {result}")
                return {
                    'success': False,
                    'error': error_msg,
                    'status_code': response.status_code,
                    'response_text': response.text
                }

            print(f"   ✅ Message accepted by Gupshup")
            print(f"   Message ID: {result.get('messageId', 'N/A')}")

            return {
                'success': True,
                'data': result,
                'status_code': response.status_code
            }
        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            status_code = getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
            response_text = getattr(e.response, 'text', '') if hasattr(e, 'response') else ''

            print(f"\n❌ Gupshup Error:")
            print(f"   Error: {error_msg}")
            print(f"   Status Code: {status_code}")
            print(f"   Response: {response_text}")

            return {
                'success': False,
                'error': error_msg,
                'status_code': status_code,
                'response_text': response_text
            }

    def send_event_invitation_template(
        self,
        destination: str,
        guest_name: str,
        event_name: str,
        event_date: str,
        event_time: str,
        event_location: str,
        image_url: Optional[str] = None
    ) -> Dict:
        """
        Send event invitation using the event_invitation_new template with optional image

        Template format from Gupshup:
        שלום {{1}} 💙 אנא לחצו על אחד מהקישורים להזמינים {{2}}! אירוח: {{3}} תאריך: {{4}} שעה: {{5}}! 💙 משפחת אירועי היום, {{6}} ⭐

        Args:
            destination: Guest phone number
            guest_name: Name of the guest ({{1}})
            event_name: Name of the event ({{2}})
            event_date: Date of the event ({{3}}) (e.g., "01/01/2025")
            event_time: Time of the event ({{4}}) (e.g., "18:00")
            event_location: Location of the event ({{5}})
            image_url: Optional URL to invitation image for Media templates
            {{6}} - Family/Host name (we'll use event_location again or empty)
        """
        # Template actual order (confusing labels in template):
        # שלום {{1}} 💙 אנא לחצו על אחד מהקישורים להזמינים {{2}}!
        # אירוח: {{3}} תאריך: {{4}} שעה: {{5}}!
        # 💙 משפחת אירועי היום, {{6}} ⭐
        #
        # The labels are misleading! Actual mapping:
        # {{3}} labeled "אירוח" = actually event_date (25/12/2025)
        # {{4}} labeled "תאריך" = actually event_time (20:00)
        # {{5}} labeled "שעה" = actually event_location (ירושלים)

        # Clean all parameters - strip whitespace to avoid template mismatch
        template_params = [
            str(guest_name).strip(),          # {{1}} - שלום
            str(event_name).strip(),          # {{2}} - להזמינים
            str(event_date).strip(),          # {{3}} - אירוח (but actually date!)
            str(event_time).strip(),          # {{4}} - תאריך (but actually time!)
            str(event_location).strip(),      # {{5}} - שעה (but actually location!)
            "SaveDay Events"                  # {{6}} - משפחת אירועי היום
        ]

        print(f"🔍 Template Params Verification:")
        print(f"   Count: {len(template_params)} (must be 6)")
        for i, param in enumerate(template_params, 1):
            print(f"   {{{{{{i}}}}}}: '{param}' (len={len(param)})")

        return self.send_template_message(
            destination=destination,
            template_name=WHATSAPP_TEMPLATE_NAME,
            template_params=template_params,
            image_url=image_url
        )


# Create singleton instance
whatsapp_service = WhatsAppInteractiveService()
