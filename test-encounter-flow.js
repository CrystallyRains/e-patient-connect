#!/usr/bin/env node

/**
 * Test script for Encounter Creation Flow
 * Tests adding encounters and viewing them in the dashboard
 */

const BASE_URL = 'http://localhost:3000'

async function testEncounterFlow() {
  console.log('📋 Testing Encounter Creation Flow...\n')

  try {
    // First, we need to login to get a token
    console.log('1. Logging in as patient...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'snigdhachaudhari1@gmail.com',
        method: 'OTP',
        otp: '123456' // Development mode OTP
      }),
    })

    const loginData = await loginResponse.json()
    console.log('Login Response:', loginResponse.status, loginData.message || loginData.error)

    if (!loginResponse.ok) {
      console.log('❌ Login failed, cannot test encounter creation')
      return
    }

    const token = loginData.token
    console.log('✅ Login successful')

    console.log('\n2. Creating a test encounter...')
    
    // Create form data for encounter
    const formData = new FormData()
    formData.append('occurredAt', new Date().toISOString().slice(0, 16)) // Current datetime
    formData.append('type', 'Consultation')
    formData.append('reasonDiagnosis', 'Regular checkup and health assessment')
    formData.append('prescriptionsNotes', 'Continue current medications, follow up in 3 months')
    formData.append('allergies', 'None known')
    formData.append('chronicConditions', 'Mild hypertension')
    formData.append('bloodGroup', 'O+')
    formData.append('recentSurgery', 'None')

    const encounterResponse = await fetch(`${BASE_URL}/api/patient/encounters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    const encounterData = await encounterResponse.json()
    console.log('Encounter Response:', encounterResponse.status, encounterData.message || encounterData.error)

    if (encounterResponse.ok) {
      console.log('✅ Encounter created successfully')
      console.log('   Encounter ID:', encounterData.encounterId)
    } else {
      console.log('❌ Encounter creation failed')
    }

    console.log('\n3. Fetching encounters to verify...')
    const getEncountersResponse = await fetch(`${BASE_URL}/api/patient/encounters`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const encountersData = await getEncountersResponse.json()
    console.log('Get Encounters Response:', getEncountersResponse.status)

    if (getEncountersResponse.ok) {
      console.log('✅ Encounters retrieved successfully')
      console.log('   Total encounters:', encountersData.encounters.length)
      if (encountersData.encounters.length > 0) {
        const latest = encountersData.encounters[0]
        console.log('   Latest encounter:', latest.type, '-', latest.reasonDiagnosis)
      }
    } else {
      console.log('❌ Failed to retrieve encounters')
      console.log('   Error:', encountersData.error)
    }

    console.log('\n4. Testing critical info API...')
    const criticalResponse = await fetch(`${BASE_URL}/api/patient/critical-info`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const criticalData = await criticalResponse.json()
    console.log('Critical Info Response:', criticalResponse.status)

    if (criticalResponse.ok) {
      console.log('✅ Critical info retrieved successfully')
      console.log('   Blood Group:', criticalData.criticalInfo?.bloodGroup || 'Not set')
      console.log('   Allergies:', criticalData.criticalInfo?.allergies || 'Not set')
    } else {
      console.log('❌ Failed to retrieve critical info')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }

  console.log('\n🏁 Encounter flow testing completed!')
}

// Run the test
testEncounterFlow()