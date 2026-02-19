const { query } = require('../config/database');
const { sendVerificationEmail, sendVerificationOTP } = require('../services/emailService');
const crypto = require('crypto');

/**
 * Generate secure verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate cryptographically random 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send email verification link
 * POST /api/v1/email/send-verification
 */
const sendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
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

    // Generate verification token (24-hour validity)
    const verificationToken = generateVerificationToken();

    // Save verification record to database
    const result = await query(
      `INSERT INTO email_verification (email, verification_token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '24 hours') 
       RETURNING id, email, expires_at`,
      [email, verificationToken]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      // Delete the verification record if email send failed
      await query('DELETE FROM email_verification WHERE id = $1', [result.rows[0].id]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { verificationToken })
      });
    }

    res.json({
      success: true,
      message: 'Verification link sent to ' + email,
      data: {
        email,
        expiresIn: '24 hours',
        ...(process.env.NODE_ENV === 'development' && { verificationToken })
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
 * Verify email with link/token
 * GET /api/v1/email/verify-token?token=xxxxx
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
       WHERE verification_token = $1 
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
          <title>Email Verified - KudiSave</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #006B3F 0%, #00a05e 100%);
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
              background: #006B3F;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
              color: white;
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
              background: #006B3F;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: all 0.2s;
            }
            .button:hover {
              background: #00a05e;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1>Email Verified!</h1>
            <p>Your email has been verified successfully. You can now login to your KudiSave account.</p>
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
 * POST /api/v1/email/resend-verification
 */
const resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

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

    // Generate new verification token
    const verificationToken = generateVerificationToken();

    const result = await query(
      `INSERT INTO email_verification (email, verification_token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '24 hours') 
       RETURNING id, email, expires_at`,
      [email, verificationToken]
    );

    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      await query('DELETE FROM email_verification WHERE id = $1', [result.rows[0].id]);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { verificationToken })
      });
    }

    res.json({
      success: true,
      message: 'Verification link resent to ' + email,
      data: {
        email,
        expiresIn: '24 hours'
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

/**
 * Send email OTP (6-digit code)
 * POST /api/v1/email/send-otp
 */
const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if already verified
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

    // Clean up expired OTPs
    await query(
      'DELETE FROM email_verification WHERE email = $1 AND expires_at < NOW()',
      [email]
    );

    // Rate limiting (1 per minute)
    const existingOTP = await query(
      'SELECT * FROM email_verification WHERE email = $1 AND expires_at > NOW() AND is_verified = false ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (existingOTP.rows.length > 0) {
      const timeSinceCreation = Date.now() - new Date(existingOTP.rows[0].created_at).getTime();
      if (timeSinceCreation < 60000) {
        return res.status(429).json({
          success: false,
          message: 'Please wait 1 minute before requesting a new code'
        });
      }
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Save to database (10-minute expiry)
    await query(
      `INSERT INTO email_verification (email, otp, verification_type, expires_at) 
       VALUES ($1, $2, 'otp', NOW() + INTERVAL '10 minutes') 
       RETURNING id, email, expires_at`,
      [email, otp]
    );

    // Log OTP in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📧 Email OTP for ${email}: ${otp}`);
      console.log(`${'='.repeat(60)}\n`);
    }

    // Send OTP email
    const emailSent = await sendVerificationOTP(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to ' + email,
      data: {
        email,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email OTP
 * POST /api/v1/email/verify-otp
 */
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    // Check OTP against database
    console.log(`🔍 Verifying email OTP for ${email}...`);
    const result = await query(
      `SELECT * FROM email_verification 
       WHERE email = $1 AND otp = $2 AND expires_at > NOW() AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark verification record as verified
    await query(
      `UPDATE email_verification 
       SET is_verified = true, verified_at = NOW() 
       WHERE id = $1`,
      [result.rows[0].id]
    );

    // Mark user's email as verified
    await query(
      `UPDATE users 
       SET email_verified = true, updated_at = NOW() 
       WHERE email = $1`,
      [email]
    );

    console.log(`✅ Email verified for ${email}`);

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
      message: 'Failed to verify code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resend email OTP
 * POST /api/v1/email/resend-otp
 */
const resendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
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

    if (userCheck.rows[0].email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. You can login now.'
      });
    }

    // Delete old unverified OTPs
    await query(
      'DELETE FROM email_verification WHERE email = $1 AND is_verified = false',
      [email]
    );

    // Generate new OTP
    const otp = generateOTP();

    await query(
      `INSERT INTO email_verification (email, otp, verification_type, expires_at) 
       VALUES ($1, $2, 'otp', NOW() + INTERVAL '10 minutes')`,
      [email, otp]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📧 Email OTP (resend) for ${email}: ${otp}`);
      console.log(`${'='.repeat(60)}\n`);
    }

    const emailSent = await sendVerificationOTP(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to resend verification email.',
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

    res.json({
      success: true,
      message: 'Verification code resent to ' + email,
      data: {
        email,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Resend email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendEmailVerification,
  verifyEmailToken,
  resendEmailVerification,
  sendEmailOTP,
  verifyEmailOTP,
  resendEmailOTP
};
