// Test the complete emergency access flow
console.log('🚨 Testing Complete Emergency Access Flow...\n');

// Test data
const doctorMobile = '+1234567890';
const patientIdentifier = 'snigdhachaudhari@gmail.com';
const reason = 'Patient unconscious, need immediate access to medical history for emergency treatment';
const hospitalName = 'Emergency Hospital';

async function testCompleteFlow() {
  try {
    console.log('Step 1: Generate OTP for doctor authentication...');
    
    // Step 1: Generate OTP
    const otpResponse = await fetch('http://localhost:3000/api/auth/otp/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: doctorMobile,
        purpose: 'EMERGENCY_ACCESS'
      })
    });

    const otpData = await otpResponse.json();
    console.log('✅ OTP Generated:', otpData.otp);

    if (!otpResponse.ok) {
      throw new Error(`OTP generation failed: ${otpData.error}`);
    }

    console.log('\nStep 2: Request emergency access with OTP...');
    
    // Step 2: Request emergency access using biometric-access API
    const emergencyResponse = await fetch('http://localhost:3000/api/emergency/biometric-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorMobile,
        patientIdentifier,
        reason,
        hospitalName,
        biometricType: 'OTP',
        biometricData: otpData.otp
      })
    });

    const emergencyData = await emergencyResponse.json();
    console.log('✅ Emergency Access Response:', {
      sessionId: emergencyData.sessionId,
      expiresAt: emergencyData.expiresAt,
      patient: emergencyData.patient.name,
      doctor: emergencyData.doctor.name
    });

    if (!emergencyResponse.ok) {
      throw new Error(`Emergency access failed: ${emergencyData.error}`);
    }

    console.log('\nStep 3: Access patient medical data...');
    
    // Step 3: Access patient data using session
    const sessionResponse = await fetch(`http://localhost:3000/api/emergency/session/${emergencyData.sessionId}`, {
      headers: {
        'Authorization': `Bearer ${emergencyData.sessionToken}`
      }
    });

    const sessionData = await sessionResponse.json();
    
    if (!sessionResponse.ok) {
      throw new Error(`Session access failed: ${sessionData.error}`);
    }

    console.log('✅ Patient Medical Data Retrieved:');
    console.log(`   Patient: ${sessionData.patient.name}`);
    console.log(`   Blood Group: ${sessionData.patient.bloodGroup}`);
    console.log(`   Allergies: ${sessionData.patient.allergies}`);
    console.log(`   Chronic Conditions: ${sessionData.patient.chronicConditions}`);
    console.log(`   Total Encounters: ${sessionData.encounters.length}`);
    console.log(`   Total Documents: ${sessionData.documents.length}`);
    
    if (sessionData.encounters.length > 0) {
      console.log(`   Latest Encounter: ${sessionData.encounters[0].type} - ${sessionData.encounters[0].reasonDiagnosis}`);
    }

    console.log('\nStep 4: Test document download (if documents exist)...');
    
    if (sessionData.documents.length > 0) {
      const firstDoc = sessionData.documents[0];
      const docResponse = await fetch(`http://localhost:3000/api/documents/${firstDoc.id}`, {
        headers: {
          'Authorization': `Bearer ${emergencyData.sessionToken}`
        }
      });

      if (docResponse.ok) {
        console.log(`✅ Document download test successful for: ${firstDoc.filename}`);
      } else {
        console.log(`❌ Document download failed for: ${firstDoc.filename}`);
      }
    } else {
      console.log('ℹ️  No documents available to test download');
    }

    console.log('\n🎉 Complete Emergency Access Flow Test PASSED!');
    console.log('\n📋 Summary:');
    console.log(`   - Doctor: ${emergencyData.doctor.name} (${emergencyData.doctor.mobile})`);
    console.log(`   - Patient: ${emergencyData.patient.name} (${emergencyData.patient.mobile})`);
    console.log(`   - Session ID: ${emergencyData.sessionId}`);
    console.log(`   - Expires: ${emergencyData.expiresAt}`);
    console.log(`   - Medical Records: ${sessionData.encounters.length} encounters, ${sessionData.documents.length} documents`);
    console.log(`   - Access Method: OTP Authentication`);
    
    return true;

  } catch (error) {
    console.error('❌ Emergency Access Flow Test FAILED:', error.message);
    return false;
  }
}

// Run the test
testCompleteFlow();