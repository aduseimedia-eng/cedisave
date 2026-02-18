// ============================================
// GMAIL OAUTH ROUTES
// Routes for connecting user's Gmail account
// ============================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const gmailService = require('../services/gmailOAuthService');

/**
 * GET /api/gmail/connect
 * Generate and return the OAuth authorization URL
 */
router.get('/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const authUrl = gmailService.getAuthUrl(userId);
    
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Gmail connect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL'
    });
  }
});

/**
 * GET /api/gmail/callback
 * Handle OAuth callback from Google
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state: userId, error } = req.query;
    
    // Check for errors from Google
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/pages/settings.html?gmail=error&reason=${encodeURIComponent(error)}`);
    }
    
    if (!code || !userId) {
      return res.redirect(`${process.env.FRONTEND_URL}/pages/settings.html?gmail=error&reason=missing_params`);
    }
    
    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code);
    
    // Get user's Gmail profile
    const profile = await gmailService.getUserProfile(tokens);
    
    // Store tokens in database
    await query(`
      UPDATE users 
      SET gmail_tokens = $1, 
          gmail_email = $2,
          gmail_connected_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [JSON.stringify(tokens), profile.email, userId]);
    
    // Send test email to confirm connection
    try {
      const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userResult.rows[0]?.name || 'User';
      
      const testEmailTemplate = gmailService.emailTemplates.testEmail(userName);
      await gmailService.sendEmailWithUserGmail(
        tokens,
        profile.email,
        {
          to: profile.email,
          ...testEmailTemplate
        }
      );
    } catch (emailError) {
      console.error('Test email failed:', emailError);
      // Continue anyway - connection was successful
    }
    
    // Redirect back to settings with success
    res.redirect(`${process.env.FRONTEND_URL}/pages/settings.html?gmail=success`);
    
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/pages/settings.html?gmail=error&reason=exchange_failed`);
  }
});

/**
 * GET /api/gmail/status
 * Check if user has Gmail connected
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT gmail_email, gmail_connected_at, gmail_tokens
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    const user = result.rows[0];
    
    if (!user || !user.gmail_tokens) {
      return res.json({
        success: true,
        connected: false
      });
    }
    
    // Verify tokens are still valid
    const tokens = JSON.parse(user.gmail_tokens);
    const isValid = await gmailService.verifyTokens(tokens);
    
    if (!isValid) {
      // Try to refresh
      try {
        const newTokens = await gmailService.refreshAccessToken(tokens.refresh_token);
        await query(`
          UPDATE users SET gmail_tokens = $1 WHERE id = $2
        `, [JSON.stringify(newTokens), userId]);
        
        return res.json({
          success: true,
          connected: true,
          email: user.gmail_email,
          connectedAt: user.gmail_connected_at
        });
      } catch (refreshError) {
        // Tokens are invalid and can't be refreshed
        await query(`
          UPDATE users 
          SET gmail_tokens = NULL, gmail_email = NULL, gmail_connected_at = NULL
          WHERE id = $1
        `, [userId]);
        
        return res.json({
          success: true,
          connected: false,
          message: 'Gmail connection expired. Please reconnect.'
        });
      }
    }
    
    res.json({
      success: true,
      connected: true,
      email: user.gmail_email,
      connectedAt: user.gmail_connected_at
    });
    
  } catch (error) {
    console.error('Gmail status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Gmail status'
    });
  }
});

/**
 * POST /api/gmail/disconnect
 * Disconnect user's Gmail account
 */
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current tokens to revoke
    const result = await query('SELECT gmail_tokens FROM users WHERE id = $1', [userId]);
    const tokens = result.rows[0]?.gmail_tokens;
    
    if (tokens) {
      const parsedTokens = JSON.parse(tokens);
      // Try to revoke access
      await gmailService.revokeAccess(parsedTokens.access_token).catch(() => {});
    }
    
    // Clear from database
    await query(`
      UPDATE users 
      SET gmail_tokens = NULL, 
          gmail_email = NULL, 
          gmail_connected_at = NULL
      WHERE id = $1
    `, [userId]);
    
    res.json({
      success: true,
      message: 'Gmail disconnected successfully'
    });
    
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail'
    });
  }
});

/**
 * POST /api/gmail/test
 * Send a test email via user's connected Gmail
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's Gmail tokens and info
    const result = await query(`
      SELECT name, gmail_tokens, gmail_email 
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    const user = result.rows[0];
    
    if (!user || !user.gmail_tokens) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect your Gmail first.'
      });
    }
    
    const tokens = JSON.parse(user.gmail_tokens);
    const testEmailTemplate = gmailService.emailTemplates.testEmail(user.name);
    
    await gmailService.sendEmailWithUserGmail(
      tokens,
      user.gmail_email,
      {
        to: user.gmail_email,
        ...testEmailTemplate
      }
    );
    
    res.json({
      success: true,
      message: 'Test email sent successfully!'
    });
    
  } catch (error) {
    console.error('Gmail test error:', error);
    
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Gmail connection expired. Please reconnect.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send test email'
    });
  }
});

/**
 * POST /api/gmail/send-notification
 * Send a notification email via user's Gmail
 * Body: { type: 'bill_reminder' | 'goal_milestone' | 'weekly_summary', data: {...} }
 */
router.post('/send-notification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, data, recipientEmail } = req.body;
    
    // Get user's Gmail tokens
    const result = await query(`
      SELECT name, gmail_tokens, gmail_email 
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    const user = result.rows[0];
    
    if (!user || !user.gmail_tokens) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected'
      });
    }
    
    const tokens = JSON.parse(user.gmail_tokens);
    let emailTemplate;
    
    // Select appropriate template
    switch (type) {
      case 'bill_reminder':
        emailTemplate = gmailService.emailTemplates.billReminder(
          data.billName,
          data.amount,
          data.dueDate
        );
        break;
      case 'goal_milestone':
        emailTemplate = gmailService.emailTemplates.goalMilestone(
          data.goalName,
          data.milestone
        );
        break;
      case 'weekly_summary':
        emailTemplate = gmailService.emailTemplates.weeklySummary(
          user.name,
          data
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
    }
    
    await gmailService.sendEmailWithUserGmail(
      tokens,
      user.gmail_email,
      {
        to: recipientEmail || user.gmail_email,
        ...emailTemplate
      }
    );
    
    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
    
  } catch (error) {
    console.error('Send notification error:', error);
    
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        success: false,
        message: 'Gmail connection expired. Please reconnect.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

module.exports = router;
