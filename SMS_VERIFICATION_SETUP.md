# SMS Verification Setup Guide

## Overview
KudiSave uses **Arkesel** for affordable SMS OTP verification. Arkesel is Ghana-based with very competitive rates (~GHS 0.01-0.05 per SMS).

## Setup Steps

### 1. Create Arkesel Account
1. Visit [https://www.arkesel.com](https://www.arkesel.com)
2. Sign up for a free account
3. Verify your email

### 2. Get API Key
1. Log in to Arkesel dashboard
2. Go to **Settings** → **API**
3. Copy your **API Key**

### 3. Add API Key to .env
```bash
# .env file in backend folder
ARKESEL_API_KEY=your_api_key_here
```

### 4. Database Setup
Run the updated database schema to create the phone_verification table:

```sql
-- This is already included in database_schema.sql
CREATE TABLE phone_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Also updates users table with phone_verified column
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
```

### 5. API Endpoints

#### Send OTP
```bash
POST /api/v1/phone/send-otp
Content-Type: application/json

{
  "phone": "233XXXXXXXXX"
}

Response (Success):
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "233XXXXXXXXX",
    "expiresIn": "10 minutes"
  }
}

Response (Dev Mode):
{
  "success": true,
  "message": "OTP sent successfully",
  "data": { ... },
  "otp": "123456"  // Only in development
}
```

#### Verify OTP
```bash
POST /api/v1/phone/verify-otp
Content-Type: application/json

{
  "phone": "233XXXXXXXXX",
  "otp": "123456"
}

Response (Success):
{
  "success": true,
  "message": "Phone number verified successfully",
  "data": {
    "phone": "233XXXXXXXXX",
    "verified": true
  }
}
```

#### Resend OTP
```bash
POST /api/v1/phone/resend-otp
Content-Type: application/json

{
  "phone": "233XXXXXXXXX"
}
```

### 6. Frontend Integration

The frontend automatically redirects users to `verify-phone.html` after registration with the phone number stored in sessionStorage.

### Update Registration Flow
After user registers:
```javascript
// In registration response handler
sessionStorage.setItem('pendingPhoneVerification', phone);
window.location.href = 'verify-phone.html';
```

## Arkesel Pricing
- **Free Tier**: Limited messages for testing
- **Pay-as-you-go**: Starting from GHS 0.01 per SMS
- **Bulk Plans**: Better rates for larger volumes

## Testing in Development
When `ARKESEL_API_KEY` is not set and `NODE_ENV=development`:
- OTP is logged to console instead of sending SMS
- API returns the OTP in response for testing
- This allows full testing without SMS costs

## Features
✅ 6-digit OTP generation
✅ 10-minute expiration
✅ 5 attempt limit (then OTP expires)
✅ Resend option (1-minute cooldown)
✅ Rate limiting
✅ Error handling
✅ Mobile-optimized verification UI

## Ghana Phone Number Format
- Standard format: `+233XXXXXXXXX` or `233XXXXXXXXX`
- Length: 11 digits total (including 233 country code)
- Examples:
  - MTN: 233024XXXXXX, 233025XXXXXX
  - Vodafone: 233020XXXXXX, 233050XXXXXX
  - AirtelTigo: 233027XXXXXX
  - Glo: 233023XXXXXX

## Security Considerations
- OTPs are hashed if possible (current implementation stores plain)
- Each OTP has a maximum of 5 verification attempts
- OTPs expire after 10 minutes
- Resend requires 1-minute wait between requests
- Phone numbers are validated against Ghana carrier prefixes

## Future Enhancements
1. Hash OTP storage with bcrypt
2. Add phone number carrier validation
3. Rate limit by IP + phone number
4. Add SMS failure retry logic
5. Support for multiple SMS providers (fallback)
