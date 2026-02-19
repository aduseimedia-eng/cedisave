// ============================================
// GMAIL OAUTH2 SERVICE
// Allows users to connect their Gmail account
// for sending notifications from their own email
// ============================================

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

// OAuth2 client configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/v1/gmail/callback`
);

// Scopes required for Gmail sending
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * Generate the authorization URL for user to connect their Gmail
 * @param {string} userId - The user's ID to include in state
 * @returns {string} Authorization URL
 */
const getAuthUrl = (userId) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId // Pass user ID to link account after callback
  });
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from callback
 * @returns {Promise<Object>} Token object
 */
const getTokensFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw new Error('Failed to exchange authorization code');
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} Updated tokens
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Get user's Gmail profile info
 * @param {Object} tokens - OAuth2 tokens
 * @returns {Promise<Object>} User profile
 */
const getUserProfile = async (tokens) => {
  try {
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get Gmail profile');
  }
};

/**
 * Create a nodemailer transporter using user's Gmail OAuth2
 * @param {Object} tokens - User's OAuth2 tokens
 * @returns {Object} Nodemailer transporter
 */
const createGmailTransporter = (tokens, userEmail) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: userEmail,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token
    }
  });
};

/**
 * Send email using user's connected Gmail account
 * @param {Object} tokens - User's OAuth2 tokens
 * @param {string} userEmail - User's Gmail address
 * @param {Object} mailOptions - Email options (to, subject, html)
 * @returns {Promise<Object>} Send result
 */
const sendEmailWithUserGmail = async (tokens, userEmail, mailOptions) => {
  try {
    const transporter = createGmailTransporter(tokens, userEmail);
    
    const result = await transporter.sendMail({
      from: `"KudiSave" <${userEmail}>`,
      ...mailOptions
    });
    
    console.log('Email sent via user Gmail:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email via user Gmail:', error);
    
    // If token expired, throw specific error
    if (error.code === 'EAUTH' || error.message.includes('invalid_grant')) {
      throw new Error('TOKEN_EXPIRED');
    }
    
    throw error;
  }
};

/**
 * Verify if user's Gmail tokens are still valid
 * @param {Object} tokens - OAuth2 tokens to verify
 * @returns {Promise<boolean>} True if valid
 */
const verifyTokens = async (tokens) => {
  try {
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    await oauth2.userinfo.get();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Revoke user's Gmail access
 * @param {string} accessToken - Token to revoke
 * @returns {Promise<boolean>} Success status
 */
const revokeAccess = async (accessToken) => {
  try {
    await oauth2Client.revokeToken(accessToken);
    return true;
  } catch (error) {
    console.error('Error revoking access:', error);
    return false;
  }
};

// Email Templates for user-gmail sending
const emailTemplates = {
  /**
   * Test notification email
   */
  testEmail: (userName) => ({
    subject: '🔔 KudiSave Gmail Connected!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #006B3F, #009B5A); }
          .header { padding: 30px; text-align: center; color: white; }
          .success-icon { font-size: 60px; margin-bottom: 15px; }
          h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .message { color: #333; font-size: 16px; line-height: 1.6; }
          .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
          .ghana-flag { display: inline-block; margin: 15px 0; }
          .flag-stripe { display: inline-block; width: 40px; height: 20px; }
          .red { background: #CE1126; }
          .gold { background: #FCD116; }
          .green { background: #006B3F; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Gmail Connected!</h1>
          </div>
          <div class="content">
            <p class="message">
              Hello ${userName}! Your Gmail account has been successfully connected to <strong>KudiSave</strong>.
            </p>
            <p class="message">
              All email notifications will now be sent from your own Gmail account. This includes:
            </p>
            <ul style="color: #333; line-height: 2;">
              <li>📊 Weekly spending summaries</li>
              <li>🔔 Bill due date reminders</li>
              <li>🎯 Goal progress updates</li>
              <li>🏆 Achievement notifications</li>
              <li>⚠️ Budget limit warnings</li>
            </ul>
            <div class="ghana-flag" style="text-align: center; width: 100%;">
              <span class="flag-stripe red"></span>
              <span class="flag-stripe gold"></span>
              <span class="flag-stripe green"></span>
            </div>
            <p class="message" style="text-align: center; color: #888;">
              KudiSave - Smart Money, Smart Future 🇬🇭
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KudiSave</p>
            <p>You can disconnect your Gmail at any time in Settings</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  /**
   * Bill reminder email template
   */
  billReminder: (billName, amount, dueDate) => ({
    subject: `🔔 Bill Reminder: ${billName} due soon!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #CE1126, #a00e1f); }
          .header { padding: 30px; text-align: center; color: white; }
          .alert-icon { font-size: 50px; margin-bottom: 10px; }
          h1 { margin: 0; font-size: 22px; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .bill-card { background: #f9f9f9; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; border-left: 4px solid #CE1126; }
          .bill-amount { font-size: 32px; font-weight: bold; color: #CE1126; }
          .bill-name { font-size: 18px; color: #333; margin-bottom: 10px; }
          .due-date { color: #888; font-size: 14px; }
          .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="alert-icon">🔔</div>
            <h1>Bill Payment Reminder</h1>
          </div>
          <div class="content">
            <p style="color: #333; font-size: 16px;">Hey there! This is a friendly reminder that you have an upcoming bill:</p>
            <div class="bill-card">
              <div class="bill-name">${billName}</div>
              <div class="bill-amount">GH₵ ${parseFloat(amount).toLocaleString()}</div>
              <div class="due-date">Due: ${new Date(dueDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              Don't miss this payment to keep your finances on track!
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KudiSave</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  /**
   * Goal milestone email template
   */
  goalMilestone: (goalName, milestone) => ({
    subject: `🎯 Goal Milestone: ${goalName} - ${milestone}% reached!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FCD116, #e6bc00); }
          .header { padding: 30px; text-align: center; color: #333; }
          .trophy-icon { font-size: 50px; margin-bottom: 10px; }
          h1 { margin: 0; font-size: 22px; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .goal-card { background: linear-gradient(135deg, #006B3F, #009B5A); border-radius: 10px; padding: 25px; text-align: center; margin: 20px 0; color: white; }
          .goal-name { font-size: 20px; margin-bottom: 15px; }
          .progress-bar { background: rgba(255,255,255,0.3); border-radius: 20px; height: 20px; overflow: hidden; }
          .progress-fill { background: #FCD116; height: 100%; border-radius: 20px; }
          .progress-text { font-size: 28px; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="trophy-icon">🎯</div>
            <h1>Goal Milestone Achieved!</h1>
          </div>
          <div class="content">
            <p style="color: #333; font-size: 16px;">Congratulations! You've hit a major milestone on your savings goal:</p>
            <div class="goal-card">
              <div class="goal-name">${goalName}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${milestone}%"></div>
              </div>
              <div class="progress-text">${milestone}% Complete!</div>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center;">
              ${milestone >= 100 ? "🎉 Amazing! You've achieved your goal!" : `Keep going! You're ${100 - milestone}% away from your target!`}
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KudiSave</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  /**
   * Weekly summary email template
   */
  weeklySummary: (userName, summaryData) => ({
    subject: '📊 Your Weekly Financial Summary - KudiSave',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #006B3F, #009B5A); }
          .header { padding: 30px; text-align: center; color: white; }
          h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
          .stat-card { background: #f9f9f9; border-radius: 10px; padding: 15px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; }
          .stat-label { color: #666; font-size: 14px; }
          .stat-value { color: #006B3F; font-size: 20px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Summary</h1>
            <p style="margin-top: 10px; opacity: 0.9;">Your financial overview for this week</p>
          </div>
          <div class="content">
            <p style="color: #333; font-size: 16px;">Hello ${userName}! Here's how you did this week:</p>
            
            <div class="stat-card">
              <span class="stat-label">💰 Total Spent</span>
              <span class="stat-value">GH₵ ${summaryData.totalSpent?.toLocaleString() || '0'}</span>
            </div>
            
            <div class="stat-card">
              <span class="stat-label">📁 Top Category</span>
              <span class="stat-value">${summaryData.topCategory || 'N/A'}</span>
            </div>
            
            <div class="stat-card">
              <span class="stat-label">💹 Savings Rate</span>
              <span class="stat-value">${summaryData.savingsRate || 0}%</span>
            </div>
            
            <div class="stat-card">
              <span class="stat-label">🔥 Current Streak</span>
              <span class="stat-value">${summaryData.streak || 0} days</span>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
              Keep up the great work! Your future self will thank you. 💪
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KudiSave</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken,
  getUserProfile,
  sendEmailWithUserGmail,
  verifyTokens,
  revokeAccess,
  emailTemplates
};
