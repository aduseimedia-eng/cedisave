const axios = require('axios');

/**
 * SMS Verification Service
 * Uses Arkesel OTP API (primary) with SMS v2 API fallback.
 * 
 * OTP API: Uses pre-approved sender ID (bypasses Ghana NCA registration),
 *          bills against main GHS balance. Arkesel generates & sends its own OTP.
 * SMS v2:  Uses custom sender ID (needs NCA registration), bills against SMS credits.
 *          We send our own locally-generated OTP in the message body.
 * 
 * Verification: Try Arkesel OTP verify first, fall back to local DB check.
 */

const ARKESEL_API_BASE = 'https://sms.arkesel.com/api';
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'KudiSave';

const crypto = require('crypto');

/**
 * Generate cryptographically random 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via Arkesel OTP API (primary) with SMS v2 fallback.
 * 
 * Strategy:
 * 1. Try OTP API first (pre-approved sender, best delivery in Ghana)
 * 2. If OTP API fails (e.g. insufficient main balance), fall back to SMS v2
 * 3. Local OTP is always stored in DB for fallback verification
 * 
 * @param {string} phone - Phone number in format 233XXXXXXXXX
 * @param {string} otp - Our locally-generated OTP (used for logging & SMS v2 fallback)
 * @returns {Promise<boolean>}
 */
const sendOTP = async (phone, otp) => {
  try {
    // Always log OTP in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📱 OTP for ${phone}: ${otp}`);
      console.log(`${'='.repeat(60)}\n`);
    }

    if (!ARKESEL_API_KEY) {
      console.warn('⚠️  ARKESEL_API_KEY not configured.');
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 Dev mode: OTP logged above, no SMS sent.');
        return true;
      }
      throw new Error('SMS service not configured');
    }

    // --- Primary: Arkesel OTP API (pre-approved sender ID, best delivery) ---
    try {
      console.log(`📤 Sending OTP to ${phone} via Arkesel OTP API...`);

      const otpResponse = await axios.post(
        `${ARKESEL_API_BASE}/otp/generate`,
        {
          expiry: 10,
          length: 6,
          medium: 'sms',
          message: `Your KudiSave verification code is %otp_code%. Valid for 10 minutes. Do not share this code.`,
          number: phone,
          sender_id: SMS_SENDER_ID,
          type: 'numeric',
        },
        {
          headers: {
            'api-key': ARKESEL_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('📨 Arkesel OTP API response:', JSON.stringify(otpResponse.data));

      if (otpResponse.data.code === '1000' || otpResponse.data.code === 1000) {
        console.log(`✅ OTP sent successfully to ${phone} via OTP API`);
        return true;
      }

      // OTP API returned non-success — fall through to SMS v2
      console.warn(`⚠️  OTP API non-success: ${JSON.stringify(otpResponse.data)}, trying SMS v2...`);
    } catch (otpErr) {
      console.warn(`⚠️  OTP API failed: ${otpErr.message}, trying SMS v2 fallback...`);
      if (otpErr.response) {
        console.warn('   OTP API response:', JSON.stringify(otpErr.response.data));
      }
    }

    // --- Fallback: Arkesel SMS v2 API (uses SMS credits, our own OTP) ---
    console.log(`📤 Sending OTP to ${phone} via Arkesel SMS v2 API (fallback)...`);

    const smsResponse = await axios.post(
      `${ARKESEL_API_BASE}/v2/sms/send`,
      {
        sender: SMS_SENDER_ID,
        message: `Your KudiSave verification code is ${otp}. Valid for 10 minutes. Do not share this code.`,
        recipients: [phone],
      },
      {
        headers: {
          'api-key': ARKESEL_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('📨 Arkesel SMS v2 response:', JSON.stringify(smsResponse.data));

    if (smsResponse.data.status === 'success' || smsResponse.data.code === 'ok') {
      console.log(`✅ OTP sent successfully to ${phone} via SMS v2`);
      return true;
    } else {
      console.error('❌ SMS v2 also failed:', JSON.stringify(smsResponse.data));
      return false;
    }
  } catch (error) {
    console.error('SMS service error:', error.message);
    if (error.response) {
      console.error('Arkesel response status:', error.response.status);
      console.error('Arkesel response data:', JSON.stringify(error.response.data));
    }
    return false;
  }
};

/**
 * Verify OTP via Arkesel OTP API
 * Used when OTP was sent via the OTP API (Arkesel generated the code).
 * 
 * @param {string} phone - Phone number in format 233XXXXXXXXX
 * @param {string} code - The OTP code to verify
 * @returns {Promise<{success: boolean, message: string}>}
 */
const verifyOTPViaArkesel = async (phone, code) => {
  try {
    if (!ARKESEL_API_KEY) {
      return { success: false, message: 'SMS service not configured' };
    }

    console.log(`🔍 Verifying OTP for ${phone} via Arkesel...`);

    const response = await axios.post(
      `${ARKESEL_API_BASE}/otp/verify`,
      {
        number: phone,
        code: code,
      },
      {
        headers: {
          'api-key': ARKESEL_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('📨 Arkesel verify response:', JSON.stringify(response.data));

    if (response.data.code === '1100' || response.data.code === 1100) {
      return { success: true, message: 'OTP verified successfully' };
    } else {
      return { success: false, message: response.data.message || 'Invalid or expired OTP' };
    }
  } catch (error) {
    console.error('OTP verify error:', error.message);
    if (error.response) {
      console.error('Arkesel verify response:', JSON.stringify(error.response.data));
      const msg = error.response.data?.message || 'Verification failed';
      return { success: false, message: msg };
    }
    return { success: false, message: 'Verification service error' };
  }
};

/**
 * Send SMS for other purposes (notifications, alerts, etc.)
 * Uses the regular SMS v2 API.
 * 
 * @param {string} phone - Phone number
 * @param {string} message - SMS message content
 * @returns {Promise<boolean>}
 */
const sendSMS = async (phone, message) => {
  try {
    if (!ARKESEL_API_KEY) {
      console.warn('⚠️  ARKESEL_API_KEY not configured');
      return false;
    }

    const response = await axios.post(
      `${ARKESEL_API_BASE}/v2/sms/send`,
      {
        sender: SMS_SENDER_ID,
        message: message,
        recipients: [phone],
      },
      {
        headers: {
          'api-key': ARKESEL_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.code === 'ok' || response.data.status === 'success';
  } catch (error) {
    console.error('SMS service error:', error.message);
    if (error.response) {
      console.error('Arkesel response:', JSON.stringify(error.response.data));
    }
    return false;
  }
};

/**
 * Check SMS account balance
 * @returns {Promise<object|null>}
 */
const checkBalance = async () => {
  try {
    if (!ARKESEL_API_KEY) {
      return null;
    }

    const response = await axios.get(
      `${ARKESEL_API_BASE}/v2/clients/balance-details`,
      {
        headers: {
          'api-key': ARKESEL_API_KEY,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to check SMS balance:', error.message);
    return null;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTPViaArkesel,
  sendSMS,
  checkBalance,
};
