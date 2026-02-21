require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  const configs = [
    {
      name: 'Port 587 STARTTLS',
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
      tls: { rejectUnauthorized: false }
    },
    {
      name: 'Port 465 SSL',
      host: 'mail.privateemail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
      tls: { rejectUnauthorized: false }
    },
    {
      name: 'Port 587 with requireTLS',
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
      tls: { rejectUnauthorized: false }
    }
  ];

  for (const config of configs) {
    console.log(`\nTesting: ${config.name}...`);
    const { name, ...transportConfig } = config;
    const transporter = nodemailer.createTransport({
      ...transportConfig,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    try {
      await transporter.verify();
      console.log(`  ✅ Connection verified!`);
      
      // Try sending a test email
      const info = await transporter.sendMail({
        from: `KudiSave <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: 'KudiSave Email Test',
        text: 'If you see this, email sending works!'
      });
      console.log(`  ✅ Email sent! MessageId: ${info.messageId}`);
      transporter.close();
      return;
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      transporter.close();
    }
  }

  console.log('\n❌ All configurations failed.');
}

testEmail();
