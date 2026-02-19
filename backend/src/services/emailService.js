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
  },
  tls: {
    rejectUnauthorized: false
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
      subject: 'Reset Your Password - KudiSave',
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
              <h1>🏦 KudiSave</h1>
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
                <p>© ${new Date().getFullYear()} KudiSave. All rights reserved.</p>
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
      subject: 'Welcome to KudiSave! 🎉',
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
              <h1>🏦 Welcome to KudiSave!</h1>
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
                <p>© ${new Date().getFullYear()} KudiSave</p>
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

// Send test email to verify notifications are working
const sendTestEmail = async (email) => {
  try {
    const mailOptions = {
      from: `"KudiSave" <${process.env.EMAIL_FROM || 'noreply@kudisave.gh'}>`,
      to: email,
      subject: '🔔 KudiSave - Notifications Working!',
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
                Great news! Your email notifications for <strong>KudiSave</strong> are working perfectly.
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
                KudiSave, Smart Future 🇬🇭
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} KudiSave</p>
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
      from: `"KudiSave" <${process.env.EMAIL_FROM || 'noreply@kudisave.gh'}>`,
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
              <p>© ${new Date().getFullYear()} KudiSave</p>
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
      from: `"KudiSave" <${process.env.EMAIL_FROM || 'noreply@kudisave.gh'}>`,
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
              <p>© ${new Date().getFullYear()} KudiSave</p>
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

/**
 * Send budget alert email
 */
const sendBudgetAlertEmail = async (email, userName, spent, budget, percentage, period) => {
  try {
    const warningLevel = percentage >= 100 ? 'exceeded' : percentage >= 90 ? 'critical' : 'warning';
    const subject = warningLevel === 'exceeded' ? '⚠️ Budget Exceeded!' : `🚨 Budget Alert - ${percentage}% Used`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${warningLevel === 'exceeded' ? '#dc3545' : '#ff6b6b'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
            .stat { background: white; padding: 15px; border-radius: 5px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #006B3F; }
            .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
            .button { display: inline-block; padding: 12px 30px; background: #006B3F; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${warningLevel === 'exceeded' ? '❌ Your Budget Has Been Exceeded' : '⚠️ Budget Alert'}
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <div class="alert-box">
                <strong>Your ${period} budget is now ${percentage}% spent.</strong>
                ${warningLevel === 'exceeded' ? 'You have exceeded your budget limit. Consider reviewing your spending.' : 'You are approaching your budget limit. Be mindful of your remaining spending.'}
              </div>
              <div class="stats">
                <div class="stat">
                  <div class="stat-value">GHS ${parseFloat(spent).toFixed(2)}</div>
                  <div class="stat-label">Spent</div>
                </div>
                <div class="stat">
                  <div class="stat-value">GHS ${parseFloat(budget).toFixed(2)}</div>
                  <div class="stat-label">Budget</div>
                </div>
              </div>
              <p>Review your recent expenses and adjust your spending patterns if necessary.</p>
              <a href="${process.env.FRONTEND_URL}/dashboard.html" class="button">View Dashboard</a>
              <div class="footer">
                <p>© ${new Date().getFullYear()} KudiSave. All rights reserved.</p>
                <p>Helping Ghanaian youth master their finances 💪🇬🇭</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Budget alert email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send budget alert email error:', error);
    return false;
  }
};

/**
 * Send weekly summary email
 */
const sendWeeklySummaryEmail = async (email, userName, expenses, income, savings, goals) => {
  try {
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : '0.0';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: '📊 Your Weekly Financial Summary - KudiSave',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #006B3F 0%, #00a05e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .section { margin: 25px 0; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #006B3F; }
            .stat-card.income { border-left-color: #10b981; }
            .stat-card.saving { border-left-color: #f59e0b; }
            .stat-value { font-size: 28px; font-weight: bold; color: #006B3F; }
            .stat-label { font-size: 12px; color: #999; text-transform: uppercase; }
            .goal-item { background: white; padding: 12px; border-radius: 5px; margin: 8px 0; border-left: 3px solid #00a05e; }
            .button { display: inline-block; padding: 12px 30px; background: #006B3F; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Weekly Summary</h1>
              <p>Your financial snapshot for the week</p>
            </div>
            <div class="content">
              <h2>Hi ${userName}! 👋</h2>
              <p>Here's how you're doing financially this week:</p>
              
              <div class="stats-grid">
                <div class="stat-card income">
                  <div class="stat-value">GHS ${parseFloat(income).toFixed(2)}</div>
                  <div class="stat-label">Income</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">GHS ${parseFloat(expenses).toFixed(2)}</div>
                  <div class="stat-label">Expenses</div>
                </div>
              </div>
              
              <div class="stats-grid">
                <div class="stat-card saving">
                  <div class="stat-value">GHS ${parseFloat(savings).toFixed(2)}</div>
                  <div class="stat-label">Savings</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${savingsRate}%</div>
                  <div class="stat-label">Savings Rate</div>
                </div>
              </div>
              
              ${goals && goals.length > 0 ? `
                <div class="section">
                  <h3>📍 Progress on Goals</h3>
                  ${goals.map(goal => `
                    <div class="goal-item">
                      <strong>${goal.title}</strong>
                      <div style="font-size: 12px; color: #666;">GHS ${parseFloat(goal.current).toFixed(2)} / GHS ${parseFloat(goal.target).toFixed(2)}</div>
                      <div style="background: #e0e0e0; height: 6px; border-radius: 3px; margin-top: 5px; overflow: hidden;">
                        <div style="background: #00a05e; height: 100%; width: ${goal.target > 0 ? Math.min(100, (goal.current / goal.target * 100)) : 0}%; transition: width 0.3s;"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">Keep up the great work! Review your dashboard for more detailed insights.</p>
              <a href="${process.env.FRONTEND_URL}/dashboard.html" class="button">View Full Dashboard</a>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} KudiSave. All rights reserved.</p>
                <p>Helping Ghanaian youth master their finances 💪🇬🇭</p>
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

/**
 * Send email verification link
 */
const sendVerificationEmail = async (email, verificationToken) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address - KudiSave';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #006B3F 0%, #00a05e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 40px; background: #006B3F; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 30px auto; text-align: center; }
          .link-text { color: #006B3F; word-break: break-all; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; color: #856404; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          h1 { margin: 0; font-size: 24px; }
          p { margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi there! 👋</p>
            <p>Thank you for signing up for KudiSave. To complete your registration, please verify your email by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f9f9f9; padding: 10px; border-radius: 5px;">
              <span class="link-text">${verificationLink}</span>
            </p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <div class="warning">
              <strong>⏰ Important:</strong> If you didn't sign up for KudiSave, please ignore this email and your account will not be created.
            </div>
            <p style="color: #999; font-size: 14px;">
              If you have any questions, contact us at support@kudisave.com
            </p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} KudiSave. All rights reserved.</p>
              <p>Helping Ghanaian youth master their finances 💪🇬🇭</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email verification link sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send email verification error:', error);
    return false;
  }
};

/**
 * Send email verification OTP (6-digit code)
 */
const sendVerificationOTP = async (email, otp) => {
  try {
    const subject = 'Your KudiSave Verification Code';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #006B3F 0%, #00a05e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; }
          .otp-code { font-size: 36px; letter-spacing: 8px; font-weight: 700; color: #006B3F; background: #f0faf5; padding: 20px 30px; border-radius: 12px; display: inline-block; margin: 20px 0; border: 2px dashed #006B3F; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; color: #856404; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
          h1 { margin: 0; font-size: 24px; }
          p { margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi there! 👋</p>
            <p>Your KudiSave verification code is:</p>
            <div style="text-align: center;">
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>This code expires in 10 minutes.</strong></p>
            <div class="warning">
              <strong>⚠️ Security:</strong> Never share this code with anyone. KudiSave will never ask for your verification code.
            </div>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this code, please ignore this email.
            </p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KudiSave. All rights reserved.</p>
              <p>Helping Ghanaian youth master their finances 💪🇬🇭</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email OTP sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send email OTP error:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendWeeklySummaryEmail,
  sendTestEmail,
  sendBillReminderEmail,
  sendGoalMilestoneEmail,
  sendBudgetAlertEmail,
  sendVerificationEmail,
  sendVerificationOTP
};
