const BASE_URL = 'http://localhost:3000';

// Use built-in fetch in Node.js 18+
async function testOperatorLogin() {
  console.log('🧪 Testing Operator Login Flow...\n');

  try {
    // Step 1: Generate OTP for patient
    console.log('1️⃣ Generating OTP for patient...');
    const otpResponse = await fetch(`${BASE_URL}/api/auth/otp/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: '1234567890', // Demo patient mobile (Snigdha) - correct format
        purpose: 'OPERATOR_LOGIN'
      }),
    });

    const otpData = await otpResponse.json();
    console.log('OTP Response:', otpData);

    if (!otpResponse.ok) {
      console.error('❌ OTP generation failed:', otpData.error);
      return;
    }

    const otp = otpData.otp; // In development mode
    console.log('✅ OTP generated:', otp);

    // Step 2: Login with OTP
    console.log('\n2️⃣ Logging in with OTP...');
    const loginResponse = await fetch(`${BASE_URL}/api/operator/otp-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientIdentifier: '1234567890',
        otp: otp
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Login Response:', loginData);

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData.error);
      return;
    }

    console.log('✅ Login successful!');
    console.log('Patient Info:', loginData.patientInfo);
    console.log('Operator Token:', loginData.operatorToken ? 'Generated' : 'Missing');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOperatorLogin();