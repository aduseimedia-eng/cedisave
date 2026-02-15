const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset Your Password - KudiPal',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏦 KudiPal</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} KudiPal. All rights reserved.</p>
                <p>Helping Ghanaian youth master their finances 💪🇬🇭</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send password reset email error:', error);
    return false;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to KudiPal! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏦 Welcome to KudiPal!</h1>
            </div>
            <div class="content">
              <h2>Akwaaba ${name}! 👋</h2>
              <p>We're excited to have you join thousands of Ghanaians who are taking control of their finances!</p>
              
              <div class="feature">
                <h3>📊 Track Every Cedi</h3>
                <p>From trotro fare to chop money - track all your expenses effortlessly.</p>
              </div>
              
              <div class="feature">
                <h3>🎯 Set Smart Goals</h3>
                <p>Whether it's saving for school fees or that new phone, we'll help you get there.</p>
              </div>
              
              <div class="feature">
                <h3>🏆 Earn Rewards</h3>
                <p>Stay consistent, hit your goals, and unlock badges and achievements!</p>
              </div>
              
              <p><strong>Ready to start your financial journey?</strong></p>
              <p>Log your first expense today and begin your streak! 🔥</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} KudiPal</p>
                <p>Building financial literacy, one Ghanaian at a time 💚💛❤️</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send welcome email error:', error);
    return false;
  }
};

/**
 * Send weekly summary email
 */
const sendWeeklySummaryEmail = async (email, name, summaryData) => {
  try {
    const { totalSpent, topCategory, savingsRate, streak } = summaryData;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Weekly Financial Summary 📊',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stat { margin: 20px 0; padding: 20px; background: white; border-radius: 5px; border-left: 4px solid #667eea; }
            .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Your Week in Review</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Here's how you did this week:</p>
              
              <div class="stat">
                <div>Total Spent</div>
                <div class="stat-value">GHS ${totalSpent.toFixed(2)}</div>
              </div>
              
              <div class="stat">
                <div>Top Spending Category</div>
                <div class="stat-value">${topCategory}</div>
              </div>
              
              <div class="stat">
                <div>Savings Rate</div>
                <div class="stat-value">${savingsRate}%</div>
              </div>
              
              <div class="stat">
                <div>Current Streak</div>
                <div class="stat-value">${streak} days 🔥</div>
              </div>
              
              <p>Keep up the great work! Your future self will thank you. 💪</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} KudiPal</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Weekly summary email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send weekly summary email error:', error);
    return false;
  }
};

// Send test email to verify notifications are working
const sendTestEmail = async (email) => {
  try {
    const mailOptions = {
      from: `"KudiPal" <${process.env.EMAIL_FROM || 'noreply@kudipal.gh'}>`,
      to: email,
      subject: '🔔 KudiPal - Notifications Working!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #006B3F, #009B5A); }
            .header { padding: 30px; text-align: center; color: white; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-icon { font-size: 60px; margin-bottom: 15px; }
            h1 { margin: 0; font-size: 24px; }
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
              <h1>Notifications Enabled!</h1>
            </div>
            <div class="content">
              <p class="message">
                Great news! Your email notifications for <strong>KudiPal</strong> are working perfectly.
              </p>
              <p class="message">
                You'll now receive important updates including:
              </p>
              <ul style="color: #333; line-height: 2;">
                <li>📊 Weekly spending summaries</li>
                <li>🔔 Bill due date reminders</li>
                <li>🎯 Goal progress updates</li>
                <li>🏆 Challenge completion alerts</li>
                <li>⚠️ Budget limit warnings</li>
              </ul>
              <div class="ghana-flag" style="text-align: center; width: 100%;">
                <span class="flag-stripe red"></span>
                <span class="flag-stripe gold"></span>
                <span class="flag-stripe green"></span>
              </div>
              <p class="message" style="text-align: center; color: #888;">
                KudiPal, Smart Future 🇬🇭
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} KudiPal</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send test email error:', error);
    return false;
  }
};

// Send bill reminder email
const sendBillReminderEmail = async (email, billName, amount, dueDate) => {
  try {
    const mailOptions = {
      from: `"KudiPal" <${process.env.EMAIL_FROM || 'noreply@kudipal.gh'}>`,
      to: email,
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
              <p>© ${new Date().getFullYear()} KudiPal</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Bill reminder email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send bill reminder email error:', error);
    return false;
  }
};

// Send goal milestone email
const sendGoalMilestoneEmail = async (email, goalName, progress, milestone) => {
  try {
    const mailOptions = {
      from: `"KudiPal" <${process.env.EMAIL_FROM || 'noreply@kudipal.gh'}>`,
      to: email,
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
              <p>© ${new Date().getFullYear()} KudiPal</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Goal milestone email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send goal milestone email error:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendWeeklySummaryEmail,
  sendTestEmail,
  sendBillReminderEmail,
  sendGoalMilestoneEmail
};
