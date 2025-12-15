# WhatsApp Invitation System - Setup Guide

## Overview

Your SaveDay Events platform now has a complete WhatsApp invitation system using Gupshup API with interactive Quick Reply buttons and conversation flow management.

## Features Implemented

### 1. Template-Based Invitations
- Uses approved WhatsApp template: `event_invitation_new`
- Sends invitation with 5 dynamic parameters:
  - Guest name
  - Event type (in Hebrew)
  - Event date
  - Event time
  - Event location
- Includes 3 Quick Reply buttons:
  - מאשר הגעה (Confirm)
  - לא אגיע (Decline)
  - לא יודע כרגע (Maybe)

### 2. Conversation Flow
When a guest clicks "מאשר הגעה":
1. System updates attendance_status to 'confirmed'
2. System sets conversation_state to 'waiting_for_guests_count'
3. Automatic follow-up message: "תודה על האישור! 🎉\n\nכמה אורחים יגיעו? (הזינו מספר בלבד)"
4. Guest replies with a number
5. System validates the number (must be positive integer)
6. System stores guests_count in database
7. System sets conversation_state to 'done'
8. Sends confirmation: "תודה רבה! רשמנו {X} אורחים 🎊\n\nמחכים לראותכם באירוע! 💙"

### 3. State Management
- **waiting_for_rsvp**: Initial state after sending invitation
- **waiting_for_guests_count**: After confirming attendance
- **done**: Conversation completed

## Configuration

### Environment Variables (.env)
```env
GUPSHUP_API_KEY=sk_7c99c2f11f284370af9248ce40a4a7d9
GUPSHUP_APP_NAME=saveday
WHATSAPP_SENDER_NUMBER=972525869312
GUPSHUP_CUSTOMER_ID=4000319642
GUPSHUP_WABA_ID=1216844380334963
```

### Template Configuration
- **Template Name**: event_invitation_new
- **Endpoint**: POST https://api.gupshup.io/wa/api/v1/template/msg
- **Authentication**: apikey in header
- **Content-Type**: application/x-www-form-urlencoded

## Files Modified

### Backend Files
1. **whatsapp_service.py** (Complete rewrite)
   - `send_invitation_whatsapp()` - Sends template with Quick Reply buttons
   - `send_follow_up_message()` - Sends session messages within 24hr window
   - `handle_rsvp_response()` - Processes button clicks and manages conversation flow
   - `handle_text_message()` - Parses and validates guest count input
   - `update_guest_state()` - Updates conversation_state in database
   - `send_bulk_invitations()` - Batch sending functionality

2. **invitations_api.py** (Webhook updated)
   - `/api/invitations/webhook/gupshup` - Handles both Quick Reply buttons and text messages
   - Identifies guests by phone number
   - Routes to appropriate handlers based on message type

3. **.env** - Contains Gupshup credentials

### Frontend Files (Already implemented)
- **GuestManagement.jsx** - Has "Send WhatsApp Invitations" button
- Green button styling for WhatsApp branding
- Status badges display for confirmed/declined/maybe

### Database
Required columns in `guests` table:
- `conversation_state` TEXT DEFAULT 'none'
- `attendance_status` TEXT DEFAULT 'pending'
- `guests_count` INTEGER
- `invitation_sent_at` TIMESTAMP
- `invitation_status` TEXT
- `whatsapp_number` TEXT
- `updated_at` TIMESTAMP

## API Endpoints

### Send Invitations
```http
POST /api/invitations/send
Content-Type: application/json

{
  "event_id": 1,
  "guest_ids": [1, 2, 3],
  "send_method": "whatsapp"
}
```

### Webhook (Gupshup Callbacks)
```http
POST /api/invitations/webhook/gupshup
Content-Type: application/json

{
  "type": "message",
  "payload": {
    "type": "quick_reply" | "text",
    "payload": { "postbackText": "..." } | { "text": "..." },
    "sender": { "phone": "972..." }
  }
}
```

## Next Steps - REQUIRED FOR TESTING

### 1. Configure Webhook URL in Gupshup Dashboard

You need to set the webhook URL in your Gupshup account to receive button clicks and text messages.

**For Local Testing:**
```bash
# Install ngrok if not already installed
# Download from: https://ngrok.com/download

# Run ngrok to expose your local server
ngrok http 8001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**In Gupshup Dashboard:**
1. Go to https://www.gupshup.io/developer/
2. Navigate to your app settings
3. Find "Webhook URL" or "Callback URL" setting
4. Enter: `https://YOUR-NGROK-URL/api/invitations/webhook/gupshup`
5. Save the configuration

**For Production:**
Deploy your backend to a public server and use:
```
https://your-domain.com/api/invitations/webhook/gupshup
```

### 2. Verify Template Approval

Ensure your template "event_invitation_new" is approved by Meta:
1. Go to Gupshup Dashboard
2. Check Templates section
3. Status should be "APPROVED"

### 3. Test End-to-End Flow

Use the test script:
```bash
cd backend
../.venv/Scripts/python.exe test_whatsapp_send.py
```

Or test with real database guests:
```bash
cd backend
../.venv/Scripts/python.exe test_send_to_guest.py
```

**Expected Flow:**
1. Guest receives WhatsApp message with invitation details
2. Guest sees 3 buttons: מאשר הגעה / לא אגיע / לא יודע כרגע
3. Guest clicks "מאשר הגעה"
4. Within seconds, guest receives: "תודה על האישור! 🎉\n\nכמה אורחים יגיעו?"
5. Guest replies with a number (e.g., "3")
6. Guest receives: "תודה רבה! רשמנו 3 אורחים 🎊"
7. Database updated with attendance_status='confirmed', guests_count=3, conversation_state='done'

### 4. Monitor Webhook Activity

Check your server logs to see incoming webhooks:
```bash
# Watch server logs
cd backend
../.venv/Scripts/python.exe run_server.py

# Look for:
# 🔔 Received webhook from Gupshup: {...}
# 📱 Quick Reply button clicked: מאשר הגעה
# 📝 Text message received: 3 from 972...
```

## Troubleshooting

### Messages Not Arriving
1. **Check Template Status**: Ensure "event_invitation_new" is APPROVED
2. **Verify Phone Format**: Numbers must be in international format (972...)
3. **Check API Key**: Confirm GUPSHUP_API_KEY is correct
4. **Review Logs**: Look for error messages in server output

### Webhook Not Receiving Data
1. **Verify Webhook URL**: Must be publicly accessible HTTPS URL
2. **Check Gupshup Dashboard**: Confirm webhook is configured
3. **Test with ngrok**: Use ngrok for local development
4. **Check Server Logs**: Look for incoming POST requests

### Button Clicks Not Working
1. **Verify Payload Structure**: Check webhook data format matches expected structure
2. **Check Phone Matching**: Guest must exist in database with matching phone number
3. **Review State Machine**: Ensure conversation_state is being updated correctly

### Guest Count Not Saving
1. **Verify State**: Guest must be in 'waiting_for_guests_count' state
2. **Check Input Validation**: Only positive integers are accepted
3. **Database Permissions**: Ensure guests_count column exists and is writable

## Security Notes

- Webhook endpoint should validate Gupshup signatures (future enhancement)
- Environment variables contain sensitive API keys - never commit .env file
- Phone numbers are used for guest identification - ensure privacy compliance
- Consider rate limiting on webhook endpoint to prevent abuse

## WhatsApp Business API Limitations

- **24-Hour Window**: Session messages (follow-ups) can only be sent within 24 hours of user interaction
- **Template Approval**: All template changes require Meta approval (1-2 business days)
- **Message Limits**: Check your Gupshup plan for message volume limits
- **Button Limits**: Quick Reply buttons limited to 3 per message

## Support Resources

- **Gupshup Documentation**: https://docs.gupshup.io/
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp/
- **Template Guidelines**: https://developers.facebook.com/docs/whatsapp/message-templates/guidelines

## Current Status

**✅ Completed:**
- WhatsApp Template API integration
- Quick Reply button handling
- Conversation flow with guest count collection
- State management system
- Database updates
- Webhook endpoint for Gupshup callbacks
- Test scripts for manual testing

**⏳ Pending:**
- Webhook URL configuration in Gupshup dashboard
- End-to-end testing with real WhatsApp messages
- Production deployment

**🔮 Future Enhancements:**
- Webhook signature verification for security
- Retry logic for failed messages
- Admin dashboard for monitoring invitation status
- Support for dynamic invitation images
- Multiple language support
- Automated reminder messages
- Analytics and reporting
