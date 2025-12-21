# SMS API Implementation - Changes Summary

## Overview
Updated the 019SMS API integration to match the official API documentation structure.

## Key Changes Made

### 1. **Payload Structure** ([sms_service.py:146-159](backend/sms_service.py#L146-L159))
- **FIXED**: Wrapped entire payload in `"sms"` key
- **FIXED**: Moved username into `"user": {"username": "..."}` object
- **FIXED**: Changed `destinations.phone` from array of objects to array of strings

**Before:**
```python
payload = {
    "username": self.username,
    "source": source[:11],
    "destinations": {
        "phone": [{"content": clean_dest}]
    },
    "message": message_text
}
```

**After:**
```python
payload = {
    "sms": {
        "user": {
            "username": self.username
        },
        "source": source[:11],
        "destinations": {
            "phone": [clean_dest]  # Array of strings, not objects
        },
        "message": message_text
    }
}
```

### 2. **Response Validation** ([sms_service.py:53-73](backend/sms_service.py#L53-L73))
- **FIXED**: Now validates `status == 0` in JSON response for success
- **BEFORE**: Only checked HTTP 200 status code
- **AFTER**: Checks both HTTP 200 AND `response_data.get('status') == 0`

```python
# Check if API returned success status (status == 0 means success)
api_status = response_data.get('status')
if api_status == 0:
    return {'success': True, 'data': response_data, 'status_code': response.status_code}
else:
    # API returned error status
    error_message = response_data.get('message', 'Unknown API error')
    return {
        'success': False,
        'error': f'API error (status {api_status}): {error_message}',
        'response_data': response_data,
        'status_code': response.status_code
    }
```

### 3. **Bulk SMS Optimization** ([sms_service.py:229-277](backend/sms_service.py#L229-L277))
- **NEW**: Added `send_bulk_sms()` method that sends multiple SMS in a single API call
- **Uses**: `"bulk"` wrapper key instead of `"sms"` for bulk sending
- **Benefit**: Reduces API calls and improves performance

```python
def send_bulk_sms(self, messages: List[Dict[str, str]], source: str = "SaveDay") -> Dict:
    """Send multiple SMS messages in a single API call using 019SMS bulk API"""
    # Format all phone numbers
    formatted_messages = []
    for msg in messages:
        # ... phone formatting logic ...
        formatted_messages.append({
            "phone": clean_dest,
            "message": msg['message']
        })

    # Build bulk payload
    payload = {
        "bulk": {
            "user": {"username": self.username},
            "source": source[:11],
            "messages": formatted_messages
        }
    }
    return self._send_request(payload)
```

### 4. **Router Updates** ([sms_router.py](backend/sms_router.py))
- **REMOVED**: `format_israeli_phone()` function from router (phone formatting now only in SMS service)
- **UPDATED**: `/send-bulk-invitations/{event_id}` endpoint to use new `send_bulk_sms()` method
- **REMOVED**: Loop-based sending, replaced with single bulk API call
- **SIMPLIFIED**: All endpoints now pass phone numbers directly to SMS service without pre-formatting

### 5. **Phone Number Formatting** ([sms_service.py:129-142](backend/sms_service.py#L129-L142))
- **Isolated**: Phone formatting logic stays ONLY in SMS service
- **Converts**: International format (972xxx) → Israeli local format (05xxx)
- **Handles**: Multiple input formats (972xxx, 05xxx, 5xxx)
- **NOT TOUCHED**: WhatsApp service and other services remain unchanged

## Testing Checklist

### Local Testing:
1. ✅ Update `.env` file with credentials:
   ```env
   SMS_019_USERNAME=2you
   SMS_019_API_TOKEN=eyJ0eXAiOiJqd3QiLCJhbGciOiJIUzI1NiJ9...
   SMS_019_TEMPLATE_NAME=SAVEDAY_INVITE
   ```

2. ✅ Test health endpoint:
   ```bash
   curl http://localhost:8000/api/sms/health
   ```
   Expected: `{"status": "configured", "username": "2you", ...}`

3. ✅ Test single SMS send:
   ```bash
   POST /api/sms/send-invitation/{guest_id}
   ```

4. ✅ Test bulk SMS send:
   ```bash
   POST /api/sms/send-bulk-invitations/{event_id}
   ```

### Production (Render):
1. ✅ Add environment variables in Render Dashboard
2. ✅ Deploy and wait for service restart
3. ✅ Test health endpoint: `https://event-gift.onrender.com/api/sms/health`
4. ✅ Test SMS sending from UI

## Files Modified

### Backend:
- ✅ `backend/sms_service.py` - Core SMS service with fixed payload structure
- ✅ `backend/sms_router.py` - Updated endpoints and removed redundant phone formatting

### Documentation:
- ✅ `SMS_API_CHANGES.md` - This file (change summary)
- ℹ️ `SMS_SETUP_GUIDE.md` - Existing setup guide (still valid)

## API Structure Reference

### Single SMS (using "sms" wrapper):
```json
{
  "sms": {
    "user": {"username": "2you"},
    "source": "SaveDay",
    "destinations": {"phone": ["0501234567"]},
    "message": "שלום..."
  }
}
```

### Bulk SMS (using "bulk" wrapper):
```json
{
  "bulk": {
    "user": {"username": "2you"},
    "source": "SaveDay",
    "messages": [
      {"phone": "0501234567", "message": "שלום..."},
      {"phone": "0509876543", "message": "שלום..."}
    ]
  }
}
```

### Success Response:
```json
{
  "status": 0,
  "message": "Success message",
  "data": {...}
}
```

### Error Response:
```json
{
  "status": 3,  // or other non-zero status
  "message": "Error message description"
}
```

## Next Steps

1. **Deploy to Render**: Push changes to git and deploy
2. **Update Environment Variables**: Ensure new API token is set in Render
3. **Test Production**: Use health endpoint and test SMS sending
4. **Monitor Logs**: Check Render logs for any API errors

## Notes

- Phone formatting is isolated in SMS service only
- WhatsApp service and other services are NOT affected
- Bulk sending now uses single API call (more efficient)
- Response validation checks `status == 0` for success
- All changes follow official 019SMS API documentation
