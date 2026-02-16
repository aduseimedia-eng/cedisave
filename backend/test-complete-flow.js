const http = require('http');

// Test data
const testPhone = '233555111222';
const testEmail = 'test' + Date.now() + '@example.com';
const testName = 'Test User ' + Date.now();
const testPassword = 'Password123';

let userId, otp;

// Step 1: Register
console.log('📝 Step 1: Registering user...');
const registerData = JSON.stringify({
  name: testName,
  email: testEmail,
  phone: testPhone,
  password: testPassword
});

const registerOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': registerData.length
  }
};

const registerReq = http.request(registerOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Status:', res.statusCode);
    console.log('✅ User registered:', data.data.user.email);
    userId = data.data.user.id;
    
    // Step 2: Send OTP
    console.log('\n📱 Step 2: Sending OTP...');
    const otpData = JSON.stringify({ phone: testPhone });
    const otpOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/phone/send-otp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': otpData.length
      }
    };
    
    const otpReq = http.request(otpOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const data = JSON.parse(body);
        otp = data.otp;
        console.log('Status:', res.statusCode);
        console.log('✅ OTP generated:', otp);
        
        // Step 3: Verify OTP
        console.log('\n🔐 Step 3: Verifying OTP...');
        setTimeout(() => {
          const verifyData = JSON.stringify({ phone: testPhone, otp });
          const verifyOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/phone/verify-otp',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': verifyData.length
            }
          };
          
          const verifyReq = http.request(verifyOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              const data = JSON.parse(body);
              console.log('Status:', res.statusCode);
              console.log('✅ OTP verified:', data.message);
              
              // Step 4: Login
              console.log('\n🔑 Step 4: Logging in...');
              setTimeout(() => {
                const loginData = JSON.stringify({ identifier: testEmail, password: testPassword });
                const loginOptions = {
                  hostname: 'localhost',
                  port: 5000,
                  path: '/api/v1/auth/login',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': loginData.length
                  }
                };
                
                const loginReq = http.request(loginOptions, (res) => {
                  let body = '';
                  res.on('data', chunk => body += chunk);
                  res.on('end', () => {
                    const data = JSON.parse(body);
                    console.log('Status:', res.statusCode);
                    if (res.statusCode === 200) {
                      console.log('✅ Login successful!');
                      console.log('Token:', data.data.token.substring(0, 20) + '...');
                      console.log('\n✨ Complete flow worked! User can now access dashboard');
                    } else {
                      console.log('❌ Login failed:', data.message);
                    }
                    process.exit(0);
                  });
                });
                
                loginReq.on('error', err => {
                  console.error('Login error:', err);
                  process.exit(1);
                });
                
                loginReq.write(loginData);
                loginReq.end();
              }, 500);
            });
          });
          
          verifyReq.on('error', err => {
            console.error('Verify error:', err);
            process.exit(1);
          });
          
          verifyReq.write(verifyData);
          verifyReq.end();
        }, 500);
      });
    });
    
    otpReq.on('error', err => {
      console.error('OTP error:', err);
      process.exit(1);
    });
    
    otpReq.write(otpData);
    otpReq.end();
  });
});

registerReq.on('error', err => {
  console.error('Register error:', err);
  process.exit(1);
});

registerReq.write(registerData);
registerReq.end();
