# Google OAuth 2.0 Implementation Guide

This document explains how to set up and use Google OAuth 2.0 authentication in the giftWeb application.

## Overview

The application now supports Google OAuth 2.0 for both login and signup. Users can:
- Sign up using their Google account (automatically creates a new user if email doesn't exist)
- Log in using their Google account (matches existing users by email)
- The system uses JWT-based authentication after successful OAuth

## Backend Implementation

### Files Created/Modified

1. **`backend/auth_google.py`** - New file containing Google OAuth routes
   - `GET /api/auth/google/login` - Returns Google OAuth URL for redirect
   - `POST /api/auth/google/callback` - Handles OAuth callback and user creation/login

2. **`backend/main.py`** - Modified to include Google OAuth router
   - Added import for `auth_google_router`
   - Registered the router with the FastAPI app

### Environment Variables Required

Add these to your `backend/.env` file:

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5173/login-success
```

### How to Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. For application type, select **Web application**
7. Add authorized redirect URIs:
   - `http://localhost:5173/login-success` (for development)
   - Add your production URL when deploying
8. Copy the **Client ID** and **Client Secret**
9. Add them to your `.env` file

### Backend Dependencies

The following Python package is required:
```bash
pip install requests
```

Already installed in the system.

## Frontend Implementation

### Files Created/Modified

1. **`frontend/src/components/GoogleLoginButton.jsx`** - Google login button component
2. **`frontend/src/components/GoogleLoginButton.css`** - Styling for the button
3. **`frontend/src/pages/LoginSuccess.jsx`** - OAuth callback handler page
4. **`frontend/src/pages/LoginSuccess.css`** - Styling for the success page
5. **`frontend/src/services/api.js`** - Added Google OAuth API methods:
   - `getGoogleLoginUrl()` - Fetches Google OAuth URL
   - `googleCallback(code)` - Exchanges auth code for user data
6. **`frontend/src/pages/Registert.jsx`** - Added Google login button to login/register page
7. **`frontend/src/pages/Registert.css`** - Added OAuth divider styling
8. **`frontend/src/main.jsx`** - Added `/login-success` route

### How It Works

#### User Flow:

1. User clicks "התחבר עם Google" (Login with Google) button on login/register page
2. Frontend calls `GET /api/auth/google/login` to get Google OAuth URL
3. User is redirected to Google's authentication page
4. User grants permission to the app
5. Google redirects back to `http://localhost:5173/login-success?code=...`
6. The `LoginSuccess` component extracts the authorization code from URL
7. Frontend calls `POST /api/auth/google/callback` with the code
8. Backend exchanges code for access token with Google
9. Backend retrieves user info from Google (email, name, google_id)
10. Backend checks if user exists by email:
    - **If exists**: Returns existing user data with `is_new_user: false`
    - **If new**: Creates new user with random password, returns user data with `is_new_user: true`
11. Frontend saves user data to AuthContext and localStorage
12. User is redirected to home page

#### Security Features:

- Random password is generated for Google-authenticated users (they won't use it)
- Email-based user matching ensures no duplicate accounts
- OAuth tokens are handled server-side only
- User data is validated before storage
- Automatic session management with "remember me" enabled

## API Endpoints

### 1. Get Google Login URL
```
GET /api/auth/google/login
```

**Response:**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

### 2. Google OAuth Callback
```
POST /api/auth/google/callback
Content-Type: application/json

{
  "code": "authorization_code_from_google"
}
```

**Response (Existing User):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "created_at": "2025-11-17T12:00:00",
  "is_new_user": false
}
```

**Response (New User):**
```json
{
  "id": 5,
  "email": "newuser@example.com",
  "full_name": "Jane Smith",
  "created_at": "2025-11-17T15:30:00",
  "is_new_user": true
}
```

## Testing the Implementation

### 1. Setup Environment Variables

Copy the example file and fill in your credentials:
```bash
cd backend
cp .env.example .env
# Edit .env and add your Google OAuth credentials
```

### 2. Start the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 3. Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

### 4. Test the Flow

1. Navigate to `http://localhost:5173/login`
2. Click the "התחבר עם Google" button
3. You'll be redirected to Google's login page
4. Sign in with your Google account
5. Grant permissions to the app
6. You'll be redirected back to `/login-success`
7. After processing, you'll be redirected to the home page
8. Check that you're logged in (user info should appear in navbar)

## Troubleshooting

### Error: "Google OAuth is not configured"
- Make sure `GOOGLE_CLIENT_ID` is set in backend `.env` file
- Restart the backend server after adding credentials

### Error: "Failed to get access token from Google"
- Check that `GOOGLE_CLIENT_SECRET` is correct
- Verify that the redirect URI in Google Console matches `GOOGLE_REDIRECT_URI`
- Make sure the OAuth code hasn't expired (valid for ~10 minutes)

### Error: "No email received from Google"
- Ensure your OAuth consent screen has the email scope enabled
- Check that the user granted email permission

### Redirect URI Mismatch
- The redirect URI in Google Console must EXACTLY match `GOOGLE_REDIRECT_URI` in `.env`
- Common issue: trailing slash or http vs https

### CORS Errors
- Make sure `http://localhost:5173` is in the backend's CORS allowed origins (already configured)

## Database Schema

The implementation uses the existing `users` table. No schema changes required.

Relevant columns:
- `id` - Primary key
- `email` - Used for matching Google accounts (must be unique)
- `password` - Random hash for Google users
- `full_name` - Populated from Google profile
- `created_at` - Timestamp

## Production Deployment

When deploying to production:

1. Update `GOOGLE_REDIRECT_URI` to your production URL:
   ```env
   GOOGLE_REDIRECT_URI=https://yourdomain.com/login-success
   ```

2. Add the production redirect URI to Google Cloud Console

3. Update CORS settings in `backend/main.py` to include your production domain

4. Consider using HTTPS for all OAuth flows (required by Google in production)

## Future Enhancements

Possible improvements:
- Add profile picture from Google
- Store Google ID for faster lookups
- Add "Link Google Account" feature for existing email/password users
- Support for Google One Tap login
- Add Facebook, GitHub, or other OAuth providers

## Support

For issues or questions, refer to:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Router Documentation](https://reactrouter.com/)
