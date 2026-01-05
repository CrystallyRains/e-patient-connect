#!/usr/bin/env node

/**
 * Test script for Emergency Access Flow
 * Tests the complete flow from emergency access request to patient profile display
 */

const BASE_URL = 'http://localhost:3000'

async function testEmergencyFlow() {
  console.log('🚨 Testing Emergency Access Flow...\n')

  try {
    // Test 1: Emergency access with patient identifier
    console.log('1. Testing emergency access WITH patient identifier...')
    const emergencyResponse1 = await fetch(`${BASE_URL}/api/emergency/biometric-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doctorMobile: '+1234567890',
        patientIdentifier: 'snigdhachaudhari1@gmail.com', // Provide patient ID
        reason: 'Patient unconscious after accident, need immediate access to medical history',
        hospitalName: 'Emergency General Hospital',
        biometricType: 'FINGERPRINT',
        biometricData: 'fingerprint_verified_' + Date.now()
      }),
    })

    const emergencyData1 = await emergencyResponse1.json()
    console.log('Response:', emergencyResponse1.status, emergencyData1.message || emergencyData1.error)

    if (emergencyResponse1.ok) {
      console.log('✅ Emergency access granted with patient identifier')
      console.log('   Session ID:', emergencyData1.sessionId)
      console.log('   Patient:', emergencyData1.patient.name)
      console.log('   Identification method:', emergencyData1.identificationMethod)
    } else {
      console.log('❌ Emergency access failed with patient identifier')
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 2: Emergency access WITHOUT patient identifier (unconscious patient)
    console.log('2. Testing emergency access WITHOUT patient identifier (unconscious patient)...')
    const emergencyResponse2 = await fetch(`${BASE_URL}/api/emergency/biometric-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doctorMobile: '+1234567890',
        patientIdentifier: '', // Empty - patient is unconscious
        reason: 'Patient unconscious after accident, unable to provide ID, using biometric scan',
        hospitalName: 'Emergency General Hospital',
        biometricType: 'IRIS',
        biometricData: 'iris_verified_' + Date.now()
      }),
    })

    const emergencyData2 = await emergencyResponse2.json()
    console.log('Response:', emergencyResponse2.status, emergencyData2.message || emergencyData2.error)

    if (emergencyResponse2.ok) {
      console.log('✅ Emergency access granted without patient identifier')
      console.log('   Session ID:', emergencyData2.sessionId)
      console.log('   Patient:', emergencyData2.patient.name)
      console.log('   Identification method:', emergencyData2.identificationMethod)

      // Test 3: Access patient session data
      console.log('\n3. Testing session data access...')
      
      // Add a small delay to ensure session is committed
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const sessionResponse = await fetch(`${BASE_URL}/api/emergency/session/${emergencyData2.sessionId}`, {
        headers: {
          'Authorization': `Bearer ${emergencyData2.sessionToken}`
        }
      })

      const sessionData = await sessionResponse.json()
      console.log('Session Response:', sessionResponse.status)

      if (sessionResponse.ok) {
        console.log('✅ Session data retrieved successfully')
        console.log('   Patient:', sessionData.patient.name)
        console.log('   Medical encounters:', sessionData.encounters.length)
        console.log('   Documents:', sessionData.documents.length)
        console.log('   Blood group:', sessionData.patient.bloodGroup || 'Not recorded')
        console.log('   Allergies:', sessionData.patient.allergies || 'None recorded')
      } else {
        console.log('❌ Failed to retrieve session data')
        console.log('   Error:', sessionData.error)
      }
    } else {
      console.log('❌ Emergency access failed without patient identifier')
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 4: Test validation - missing required fields
    console.log('4. Testing validation (missing doctor mobile)...')
    const validationResponse = await fetch(`${BASE_URL}/api/emergency/biometric-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // doctorMobile: missing
        patientIdentifier: '',
        reason: 'Test validation',
        hospitalName: 'Test Hospital',
        biometricType: 'FINGERPRINT',
        biometricData: 'test_data'
      }),
    })

    const validationData = await validationResponse.json()
    console.log('Validation Response:', validationResponse.status, validationData.error)

    if (validationResponse.status === 400) {
      console.log('✅ Validation working correctly - rejected missing required fields')
    } else {
      console.log('❌ Validation not working properly')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }

  console.log('\n🏁 Emergency access flow testing completed!')
}

// Run the test
testEmergencyFlow()