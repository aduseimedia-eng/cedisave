const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');
const { OAuth2Client } = require('google-auth-library');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user (phone_verified will be false by default)
    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, phone, created_at`,
      [name, email, phone, password_hash]
    );

    const user = result.rows[0];

    // Create initial streak record
    await query(
      'INSERT INTO streaks (user_id) VALUES ($1)',
      [user.id]
    );

    // Create initial XP record
    await query(
      'INSERT INTO user_xp (user_id) VALUES ($1)',
      [user.id]
    );

    // Registration successful — email verification required
    res.status(201).json({
      success: true,
      message: 'Registration successful. Email verification required.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          email_verified: false
        },
        requiresEmailVerification: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or phone
    const result = await query(
      'SELECT id, name, email, phone, password_hash FROM users WHERE email = $1 OR phone = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    const emailVerificationResult = await query(
      'SELECT email_verified FROM users WHERE id = $1',
      [user.id]
    );

    const emailVerified = emailVerificationResult.rows[0]?.email_verified || false;

    if (!emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please verify your email first.',
        data: {
          requiresEmailVerification: true,
          email: user.email
        }
      });
    }

    // Generate tokens
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Update last login (optional)
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          email_verified: true
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT 
        u.id, u.name, u.email, u.phone, u.created_at,
        u.theme, u.currency, u.profile_picture, u.low_data_mode, 
        u.last_visited_page, u.notification_preferences,
        s.current_streak, s.longest_streak,
        x.total_xp, x.level
       FROM users u
       LEFT JOIN streaks s ON u.id = s.user_id
       LEFT JOIN user_xp x ON u.id = x.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, 
      phone, 
      theme, 
      currency, 
      profile_picture, 
      low_data_mode, 
      last_visited_page,
      notification_preferences 
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (theme !== undefined) {
      updates.push(`theme = $${paramCount++}`);
      values.push(theme);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(currency);
    }
    if (profile_picture !== undefined) {
      updates.push(`profile_picture = $${paramCount++}`);
      values.push(profile_picture);
    }
    if (low_data_mode !== undefined) {
      updates.push(`low_data_mode = $${paramCount++}`);
      values.push(low_data_mode);
    }
    if (last_visited_page !== undefined) {
      updates.push(`last_visited_page = $${paramCount++}`);
      values.push(last_visited_page);
    }
    if (notification_preferences !== undefined) {
      updates.push(`notification_preferences = $${paramCount++}`);
      values.push(JSON.stringify(notification_preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, email, phone, theme, currency, profile_picture, 
                 low_data_mode, last_visited_page, notification_preferences`,
      values
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const result = await query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link will be sent'
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // Send email (implement email service)
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json({
      success: true,
      message: 'If the email exists, a password reset link will be sent'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Find user with valid token
    const result = await query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const userId = result.rows[0].id;

    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = $2`,
      [password_hash, userId]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

/**
 * Change password (for logged-in users)
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Get user's current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [password_hash, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

/**
 * Google OAuth Sign-In
 * POST /api/v1/auth/google
 */
const googleAuth = async (req, res) => {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Google credential or access token required'
      });
    }

    let googleUser;

    if (credential) {
      // Verify Google ID token (from One Tap / standard button callback)
      const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      googleUser = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.given_name || 'Google User',
        picture: payload.picture,
        emailVerified: payload.email_verified
      };
    } else {
      // Verify via Google userinfo endpoint (OAuth2 access token flow)
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        return res.status(401).json({ success: false, message: 'Invalid Google access token' });
      }
      const info = await response.json();
      googleUser = {
        googleId: info.id,
        email: info.email,
        name: info.name || `${info.given_name || ''} ${info.family_name || ''}`.trim() || 'Google User',
        picture: info.picture,
        emailVerified: info.verified_email
      };
    }

    if (!googleUser.email) {
      return res.status(400).json({ success: false, message: 'Could not get email from Google account' });
    }

    // Find existing user by google_id or email
    const existing = await query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
      [googleUser.googleId, googleUser.email]
    );

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      // Link google_id and update profile picture / mark email verified
      await query(
        `UPDATE users
           SET google_id = $1,
               profile_picture = COALESCE(profile_picture, $2),
               email_verified = true,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [googleUser.googleId, googleUser.picture, user.id]
      );
    } else {
      // Create new user (no phone/password for Google-only accounts)
      const newUser = await query(
        `INSERT INTO users (name, email, google_id, auth_provider, profile_picture, email_verified)
         VALUES ($1, $2, $3, 'google', $4, true)
         RETURNING *`,
        [googleUser.name, googleUser.email, googleUser.googleId, googleUser.picture]
      );
      user = newUser.rows[0];
    }

    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    console.log(`✅ Google auth: ${googleUser.email}`);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          email_verified: true,
          profile_picture: googleUser.picture,
          auth_provider: 'google'
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Google sign-in failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  changePassword,
  googleAuth
};
