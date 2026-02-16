const https = require('http');

const phone = '233991999888';

// Step 1: Send OTP
console.log('📱 Sending OTP to', phone);
const sendOtpOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/phone/send-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(sendOtpOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const data = JSON.parse(body);
    const otp = data.otp;
    console.log('✅ OTP Generated:', otp);
    
    if (!otp) {
      console.log('❌ No OTP in response');
      process.exit(1);
    }
    
    // Step 2: Verify OTP immediately
    console.log('\n🔐 Verifying OTP...');
    setTimeout(() => {
      const verifyOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/v1/phone/verify-otp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const verifyReq = https.request(verifyOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log('Status:', res.statusCode);
          const data = JSON.parse(body);
          console.log('Response:', JSON.stringify(data, null, 2));
          process.exit(0);
        });
      });
      
      verifyReq.on('error', err => {
        console.error('Error:', err);
        process.exit(1);
      });
      
      verifyReq.write(JSON.stringify({ phone, otp }));
      verifyReq.end();
    }, 500);
  });
});

req.on('error', err => {
  console.error('Error:', err);
  process.exit(1);
});

req.write(JSON.stringify({ phone }));
req.end();
