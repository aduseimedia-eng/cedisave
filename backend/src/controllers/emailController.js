const { query } = require('../config/database');
const { sendVerificationEmail } = require('../services/emailService');
const crypto = require('crypto');

/**
 * Generate random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate secure verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Send email verification (OTP or Link)
 * POST /auth/email/send-verification
 */
const sendEmailVerification = async (req, res) => {
  try {
    const { email, verificationType = 'otp' } = req.body;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate verification type
    if (!['otp', 'link'].includes(verificationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification type. Use "otp" or "link"'
      });
    }

    // Check if user already exists with this email
    const userCheck = await query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0 && userCheck.rows[0].email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. You can login now.'
      });
    }

    // Clean up expired verifications
    await query(
      'DELETE FROM email_verification WHERE email = $1 AND expires_at < NOW()',
      [email]
    );

    // Check rate limiting (1 per minute)
    const existingVerification = await query(
      'SELECT * FROM email_verification WHERE email = $1 AND expires_at > NOW() AND is_verified = false ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (existingVerification.rows.length > 0) {
      const timeSinceCreation = Date.now() - new Date(existingVerification.rows[0].created_at).getTime();
      const minutesPassed = Math.floor(timeSinceCreation / 60000);
      
      if (minutesPassed < 1) {
        return res.status(429).json({
          success: false,
          message: 'Please wait 1 minute before requesting a new verification'
        });
      }
    }

    let otp = null;
    let verificationToken = null;

    if (verificationType === 'otp') {
      otp = generateOTP();
    } else {
      verificationToken = generateVerificationToken();
    }

    // Save verification record to database
    const result = await query(
      `INSERT INTO email_verification (email, otp, verification_token, verification_type, expires_at) 
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes') 
       RETURNING id, email, expires_at, verification_type`,
      [email, otp, verificationToken, verificationType]
    );

    // Send email
    const emailSent = await sendVerificationEmail(email, verificationType, otp, verificationToken);

    if (!emailSent) {
      // Delete the verification record if email send failed
      await query('DELETE FROM email_verification WHERE id = $1', [result.rows[0].id]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { otp, verificationToken })
      });
    }

    res.json({
      success: true,
      message: `Verification ${verificationType === 'otp' ? 'code' : 'link'} sent to ${email}`,
      data: {
        email,
        verificationType,
        expiresIn: '15 minutes',
        ...(process.env.NODE_ENV === 'development' && { otp, verificationToken })
      }
    });
  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email OTP code
 * POST /auth/email/verify-otp
 */
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find valid OTP
    const result = await query(
      `SELECT * FROM email_verification 
       WHERE email = $1 AND otp = $2 AND verification_type = 'otp' 
       AND expires_at > NOW() AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      // Increment attempts
      await query(
        `UPDATE email_verification 
         SET attempts = attempts + 1 
         WHERE email = $1 AND verification_type = 'otp' AND expires_at > NOW() AND is_verified = false`,
        [email]
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const verificationRecord = result.rows[0];

    // Check attempts
    if (verificationRecord.attempts >= verificationRecord.max_attempts) {
      await query(
        'DELETE FROM email_verification WHERE id = $1',
        [verificationRecord.id]
      );

      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Request a new verification email.'
      });
    }

    // Mark as verified
    await query(
      `UPDATE email_verification 
       SET is_verified = true, verified_at = NOW() 
       WHERE id = $1`,
      [verificationRecord.id]
    );

    // Mark email as verified for user
    await query(
      `UPDATE users 
       SET email_verified = true, updated_at = NOW() 
       WHERE email = $1`,
      [email]
    );

    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        email,
        verified: true,
        message: 'You can now login to your account'
      }
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email with link/token
 * GET /auth/email/verify-token?token=xxxxx
 */
const verifyEmailToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find valid token
    const result = await query(
      `SELECT * FROM email_verification 
       WHERE verification_token = $1 AND verification_type = 'link' 
       AND expires_at > NOW() AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link'
      });
    }

    const verificationRecord = result.rows[0];
    const email = verificationRecord.email;

    // Mark as verified
    await query(
      `UPDATE email_verification 
       SET is_verified = true, verified_at = NOW() 
       WHERE id = $1`,
      [verificationRecord.id]
    );

    // Mark email as verified for user
    await query(
      `UPDATE users 
       SET email_verified = true, updated_at = NOW() 
       WHERE email = $1`,
      [email]
    );

    // Return HTML response for browser
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verified - KudiPal</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              text-align: center;
            }
            .icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              background: #4caf50;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
              font-size: 28px;
            }
            p {
              color: #666;
              margin-bottom: 30px;
              font-size: 16px;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              padding: 14px 40px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: all 0.2s;
            }
            .button:hover {
              background: #764ba2;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1>Email Verified!</h1>
            <p>Your email has been verified successfully. You can now login to your KudiPal account.</p>
            <a href="${process.env.FRONTEND_URL}/index.html?verified=true" class="button">Go to Login</a>
          </div>
        </body>
        </html>
      `);
    }

    // JSON response
    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        email,
        verified: true,
        message: 'You can now login to your account'
      }
    });
  } catch (error) {
    console.error('Verify email token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resend email verification
 * POST /auth/email/resend
 */
const resendEmailVerification = async (req, res) => {
  try {
    const { email, verificationType = 'otp' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists with this email
    const userCheck = await query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    // Don't allow resending if already verified
    if (userCheck.rows[0].email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. You can login now.'
      });
    }

    // Delete old unverified verifications
    await query(
      `DELETE FROM email_verification 
       WHERE email = $1 AND is_verified = false`,
      [email]
    );

    // Generate new verification
    let otp = null;
    let verificationToken = null;

    if (verificationType === 'otp') {
      otp = generateOTP();
    } else {
      verificationToken = generateVerificationToken();
    }

    const result = await query(
      `INSERT INTO email_verification (email, otp, verification_token, verification_type, expires_at) 
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes') 
       RETURNING id, email, expires_at`,
      [email, otp, verificationToken, verificationType]
    );

    const emailSent = await sendVerificationEmail(email, verificationType, otp, verificationToken);

    if (!emailSent) {
      await query('DELETE FROM email_verification WHERE id = $1', [result.rows[0].id]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { otp, verificationToken })
      });
    }

    res.json({
      success: true,
      message: `Verification ${verificationType === 'otp' ? 'code' : 'link'} resent to ${email}`,
      data: {
        email,
        verificationType,
        expiresIn: '15 minutes'
      }
    });
  } catch (error) {
    console.error('Resend email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendEmailVerification,
  verifyEmailOTP,
  verifyEmailToken,
  resendEmailVerification
};
