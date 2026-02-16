const { query } = require('../config/database');
const { generateOTP, sendOTP } = require('../services/smsService');

/**
 * Send OTP to phone number
 * POST /auth/phone/send-otp
 */
const sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone format (Ghana format: 233XXXXXXXXX)
    if (!/^233[0-9]{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ghana phone number. Use format: 233XXXXXXXXX'
      });
    }

    // Clean up expired OTPs for this phone
    await query(
      'DELETE FROM phone_verification WHERE phone = $1 AND expires_at < NOW()',
      [phone]
    );

    // Check if there's already a valid OTP
    const existingOTP = await query(
      'SELECT * FROM phone_verification WHERE phone = $1 AND expires_at > NOW() AND is_verified = false ORDER BY created_at DESC LIMIT 1',
      [phone]
    );

    if (existingOTP.rows.length > 0) {
      const timeSinceCreation = Date.now() - new Date(existingOTP.rows[0].created_at).getTime();
      const minutesPassed = Math.floor(timeSinceCreation / 60000);
      
      if (minutesPassed < 1) {
        return res.status(429).json({
          success: false,
          message: 'Please wait 1 minute before requesting a new OTP'
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();

    // Save OTP to database (expires in 10 minutes)
    const result = await query(
      `INSERT INTO phone_verification (phone, otp, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes') 
       RETURNING id, phone, expires_at`,
      [phone, otp]
    );

    // Send OTP via SMS
    const smsSent = await sendOTP(phone, otp);

    if (!smsSent) {
      // Delete the OTP if SMS failed
      await query('DELETE FROM phone_verification WHERE id = $1', [result.rows[0].id]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        // In dev mode, include OTP for testing
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP
 * POST /auth/phone/verify-otp
 */
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Find valid OTP
    const result = await query(
      `SELECT * FROM phone_verification 
       WHERE phone = $1 AND otp = $2 AND expires_at > NOW() AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otp]
    );

    if (result.rows.length === 0) {
      // Increment attempts
      await query(
        `UPDATE phone_verification 
         SET attempts = attempts + 1 
         WHERE phone = $1 AND expires_at > NOW() AND is_verified = false`,
        [phone]
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const otpRecord = result.rows[0];

    // Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await query(
        'DELETE FROM phone_verification WHERE id = $1',
        [otpRecord.id]
      );

      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Request a new OTP.'
      });
    }

    // Mark as verified
    await query(
      `UPDATE phone_verification 
       SET is_verified = true, verified_at = NOW() 
       WHERE id = $1`,
      [otpRecord.id]
    );

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        phone,
        verified: true
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resend OTP
 * POST /auth/phone/resend-otp
 */
const resendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Delete old unverified OTPs
    await query(
      `DELETE FROM phone_verification 
       WHERE phone = $1 AND is_verified = false`,
      [phone]
    );

    // Send new OTP
    const otp = generateOTP();
    const result = await query(
      `INSERT INTO phone_verification (phone, otp, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes') 
       RETURNING id, phone, expires_at`,
      [phone, otp]
    );

    const smsSent = await sendOTP(phone, otp);

    if (!smsSent) {
      await query('DELETE FROM phone_verification WHERE id = $1', [result.rows[0].id]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        phone,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
  resendPhoneOTP
};
