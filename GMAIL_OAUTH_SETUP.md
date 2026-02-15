# Gmail OAuth2 Setup Guide

This guide explains how to set up Gmail OAuth2 for KudiPal so users can connect their Gmail accounts to send email notifications.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top
3. Click "New Project"
4. Enter a project name (e.g., "KudiPal Gmail Integration")
5. Click "Create"

## Step 2: Enable Gmail API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" (for testing with any Google account)
3. Fill in the required information:
   - **App name**: KudiPal
   - **User support email**: Your email address
   - **Developer email**: Your email address
4. Click "Save and Continue"
5. On "Scopes" page, click "Add or Remove Scopes"
6. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
7. Click "Update" then "Save and Continue"
8. On "Test users" page, add any Google accounts you want to test with
9. Click "Save and Continue"

## Step 4: Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "KudiPal Web Client")
5. Under "Authorized redirect URIs", add:
   - For development: `http://localhost:5000/api/v1/gmail/callback`
   - For production: `https://your-domain.com/api/v1/gmail/callback`
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

Update your `backend/.env` file with the credentials:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/gmail/callback
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:8080
```

## Step 6: Run Database Migration

Execute the migration to add Gmail OAuth columns to the users table:

```sql
-- Run this in your PostgreSQL database
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gmail_tokens TEXT,
ADD COLUMN IF NOT EXISTS gmail_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_gmail_email ON users(gmail_email);
```

Or run the migration file:
```bash
psql -d smart_money_gh -f backend/migrations/add_gmail_oauth.sql
```

## Step 7: Test the Integration

1. Start the backend server: `npm run dev`
2. Open the frontend and go to Settings
3. Click on "Gmail Notifications"
4. Click "Connect Gmail"
5. Sign in with your Google account
6. Grant permissions
7. You should be redirected back to settings with Gmail connected

## Production Considerations

### Publishing Your App

If you want your app to be used by anyone (not just test users):

1. Go to OAuth consent screen
2. Click "Publish App"
3. Complete Google's verification process

### Security Best Practices

1. **Never commit credentials**: Keep `.env` out of version control
2. **Use HTTPS in production**: Update `GOOGLE_REDIRECT_URI` to use `https://`
3. **Rotate secrets regularly**: Periodically regenerate your client secret
4. **Monitor usage**: Check Google Cloud Console for API usage and quotas

## Troubleshooting

### "Access Denied" Error
- Make sure your Google account is added as a test user
- Verify the OAuth consent screen is configured correctly

### "Redirect URI Mismatch"
- The redirect URI in Google Console must exactly match the one in your `.env`
- Check for trailing slashes or http vs https

### Token Refresh Issues
- Ensure you requested `access_type: 'offline'` (already configured in the code)
- If tokens stop working, users need to disconnect and reconnect

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/gmail/connect` | Get OAuth authorization URL |
| GET | `/api/v1/gmail/callback` | OAuth callback handler |
| GET | `/api/v1/gmail/status` | Check Gmail connection status |
| POST | `/api/v1/gmail/disconnect` | Disconnect Gmail account |
| POST | `/api/v1/gmail/test` | Send test email via user's Gmail |
| POST | `/api/v1/gmail/send-notification` | Send notification via Gmail |

## Support

If you encounter issues, check:
1. Google Cloud Console for API errors
2. Backend server logs for detailed error messages
3. Browser console for frontend errors
