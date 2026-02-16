const axios = require('axios');

/**
 * SMS Verification Service
 * Using Arkesel - Most affordable SMS service for Ghana
 * Rates: ~GHS 0.01-0.05 per SMS (cheaper than competitors)
 */

const ARKESEL_API_BASE = 'https://sms.arkesel.com/api/v2';
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;

/**
 * Generate random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS using Arkesel
 * @param {string} phone - Phone number in format 233XXXXXXXXX
 * @param {string} otp - One-time password
 * @returns {Promise<boolean>}
 */
const sendOTP = async (phone, otp) => {
  try {
    if (!ARKESEL_API_KEY) {
      console.warn('⚠️  ARKESEL_API_KEY not configured. OTP not sent.');
      // For development, just return true and log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 DEV MODE - OTP for ${phone}: ${otp}`);
        return true;
      }
      throw new Error('SMS service not configured');
    }

    const message = `Your KudiPal verification code is: ${otp}. Valid for 10 minutes.`;

    const response = await axios.post(
      `${ARKESEL_API_BASE}/sms/send`,
      {
        phone: phone,
        message: message,
      },
      {
        headers: {
          'api-key': ARKESEL_API_KEY,
        },
      }
    );

    // Arkesel returns { code: "ok", data: { ... } } on success
    if (response.data.code === 'ok') {
      console.log(`✅ OTP sent to ${phone}`);
      return true;
    } else {
      console.error('❌ Arkesel error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('SMS service error:', error.message);
    return false;
  }
};

/**
 * Send SMS for other purposes
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
      `${ARKESEL_API_BASE}/sms/send`,
      {
        phone: phone,
        message: message,
      },
      {
        headers: {
          'api-key': ARKESEL_API_KEY,
        },
      }
    );

    return response.data.code === 'ok';
  } catch (error) {
    console.error('SMS service error:', error.message);
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
      `${ARKESEL_API_BASE}/sms/balance`,
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
  sendSMS,
  checkBalance,
};
