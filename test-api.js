/**
 * E-Patient Connect API Testing Script
 * 
 * This script tests all major API endpoints to ensure they work correctly.
 * Run with: node test-api.js
 * 
 * Make sure the server is running on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000/api'

// Test data
const testData = {
  patient: {
    name: 'Test Patient',
    mobile: '+1234567890',
    email: 'test.patient@example.com',
    idProofType: 'Aadhaar',
    idProofNumber: 'TEST-1234-5678',
    emergencyContact: '+1234567891'
  },
  doctor: {
    mobile: '+1234567892',
    email: 'dr.test@example.com'
  },
  operator: {
    mobile: '+1234567893',
    email: 'test.operator@example.com'
  }
}

let tokens = {
  patient: null,
  doctor: null,
  operator: null,
  emergency: null
}

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
}

// Helper functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  }
  console.log(`${colors[type]}${message}\x1b[0m`)
}

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  log(`${status} ${name} ${message}`, passed ? 'success' : 'error')
  testResults.tests.push({ name, passed, message })
  if (passed) testResults.passed++
  else testResults.failed++
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return { response, data, status: response.status }
  } catch (error) {
    return { error: error.message, status: 500 }
  }
}

// Test functions
async function testHealthCheck() {
  log('\n🏥 Testing Health Check...', 'info')
  
  const { response, data, status } = await makeRequest('/health')
  
  logTest('Health Check', status === 200, `Status: ${status}`)
  logTest('Health Response Structure', 
    data && data.status && data.timestamp && data.services,
    'Has required fields'
  )
}

async function testOTPGeneration() {
  log('\n📱 Testing OTP Generation...', 'info')
  
  // Test patient OTP
  const { data, status } = await makeRequest('/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testData.patient.mobile,
      purpose: 'LOGIN'
    })
  })
  
  logTest('OTP Generation', status === 200, `Status: ${status}`)
  logTest('OTP Response', data && data.message, 'Has success message')
  
  if (data && data.otp) {
    testData.patient.otp = data.otp
    log(`Development OTP: ${data.otp}`, 'warning')
  }
}

async function testPatientLogin() {
  log('\n👤 Testing Patient Login...', 'info')
  
  if (!testData.patient.otp) {
    logTest('Patient Login', false, 'No OTP available')
    return
  }
  
  const { data, status } = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testData.patient.mobile,
      method: 'OTP',
      otp: testData.patient.otp
    })
  })
  
  logTest('Patient Login', status === 200, `Status: ${status}`)
  
  if (data && data.token) {
    tokens.patient = data.token
    logTest('Patient Token', true, 'Token received')
  } else {
    logTest('Patient Token', false, 'No token received')
  }
}

async function testPatientProfile() {
  log('\n📋 Testing Patient Profile...', 'info')
  
  if (!tokens.patient) {
    logTest('Patient Profile', false, 'No patient token')
    return
  }
  
  const { data, status } = await makeRequest('/user/profile', {
    headers: {
      'Authorization': `Bearer ${tokens.patient}`
    }
  })
  
  logTest('Get Patient Profile', status === 200, `Status: ${status}`)
  logTest('Profile Data', 
    data && data.user && data.user.role === 'PATIENT',
    'Has patient role'
  )
}

async function testEncounterCreation() {
  log('\n🏥 Testing Encounter Creation...', 'info')
  
  if (!tokens.patient) {
    logTest('Encounter Creation', false, 'No patient token')
    return
  }
  
  const { data, status } = await makeRequest('/encounters', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.patient}`
    },
    body: JSON.stringify({
      occurredAt: new Date().toISOString(),
      type: 'Consultation',
      reasonDiagnosis: 'Test consultation for API testing',
      prescriptionsNotes: 'Test prescription notes',
      allergiesSnapshot: 'No known allergies',
      bloodGroup: 'O+'
    })
  })
  
  logTest('Create Encounter', status === 200, `Status: ${status}`)
  
  if (data && data.encounterId) {
    testData.encounterId = data.encounterId
    logTest('Encounter ID', true, `ID: ${data.encounterId}`)
  }
}

async function testEncounterRetrieval() {
  log('\n📊 Testing Encounter Retrieval...', 'info')
  
  if (!tokens.patient) {
    logTest('Encounter Retrieval', false, 'No patient token')
    return
  }
  
  const { data, status } = await makeRequest('/encounters', {
    headers: {
      'Authorization': `Bearer ${tokens.patient}`
    }
  })
  
  logTest('Get Encounters', status === 200, `Status: ${status}`)
  logTest('Encounters Data', 
    data && Array.isArray(data.encounters),
    'Has encounters array'
  )
}

async function testDoctorLogin() {
  log('\n👨‍⚕️ Testing Doctor Authentication...', 'info')
  
  // Generate OTP for doctor
  const otpResult = await makeRequest('/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testData.doctor.mobile,
      purpose: 'LOGIN'
    })
  })
  
  if (otpResult.data && otpResult.data.otp) {
    testData.doctor.otp = otpResult.data.otp
    
    // Login as doctor
    const { data, status } = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: testData.doctor.mobile,
        method: 'OTP',
        otp: testData.doctor.otp
      })
    })
    
    logTest('Doctor Login', status === 200, `Status: ${status}`)
    
    if (data && data.token) {
      tokens.doctor = data.token
      logTest('Doctor Token', true, 'Token received')
    }
  } else {
    logTest('Doctor OTP Generation', false, 'Failed to generate OTP')
  }
}

async function testEmergencyAccess() {
  log('\n🚨 Testing Emergency Access...', 'info')
  
  if (!tokens.doctor) {
    logTest('Emergency Access', false, 'No doctor token')
    return
  }
  
  const { data, status } = await makeRequest('/emergency/request', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.doctor}`
    },
    body: JSON.stringify({
      patientIdentifier: testData.patient.mobile,
      reason: 'API Testing Emergency Access',
      hospitalName: 'Test Hospital',
      authMethod: 'OTP',
      authData: '123456' // Mock OTP
    })
  })
  
  logTest('Emergency Access Request', status === 200, `Status: ${status}`)
  
  if (data && data.sessionToken) {
    tokens.emergency = data.sessionToken
    testData.sessionId = data.sessionId
    logTest('Emergency Token', true, 'Emergency session created')
  }
}

async function testAuditLogs() {
  log('\n📝 Testing Audit Logs...', 'info')
  
  if (!tokens.patient) {
    logTest('Audit Logs', false, 'No patient token')
    return
  }
  
  const { data, status } = await makeRequest('/audit/logs', {
    headers: {
      'Authorization': `Bearer ${tokens.patient}`
    }
  })
  
  logTest('Get Audit Logs', status === 200, `Status: ${status}`)
  logTest('Audit Data', 
    data && Array.isArray(data.logs),
    'Has logs array'
  )
}

async function testSessionValidation() {
  log('\n🔐 Testing Session Validation...', 'info')
  
  if (!tokens.patient) {
    logTest('Session Validation', false, 'No patient token')
    return
  }
  
  const { data, status } = await makeRequest('/auth/session/validate', {
    headers: {
      'Authorization': `Bearer ${tokens.patient}`
    }
  })
  
  logTest('Session Validation', status === 200, `Status: ${status}`)
  logTest('Session Data', 
    data && data.user,
    'Has user data'
  )
}

// Main test runner
async function runTests() {
  log('🚀 Starting E-Patient Connect API Tests', 'info')
  log('=' .repeat(50), 'info')
  
  try {
    await testHealthCheck()
    await testOTPGeneration()
    await testPatientLogin()
    await testPatientProfile()
    await testEncounterCreation()
    await testEncounterRetrieval()
    await testDoctorLogin()
    await testEmergencyAccess()
    await testAuditLogs()
    await testSessionValidation()
    
    // Final results
    log('\n' + '=' .repeat(50), 'info')
    log('📊 Test Results Summary', 'info')
    log('=' .repeat(50), 'info')
    
    log(`✅ Passed: ${testResults.passed}`, 'success')
    log(`❌ Failed: ${testResults.failed}`, 'error')
    log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`, 'info')
    
    if (testResults.failed > 0) {
      log('\n❌ Failed Tests:', 'error')
      testResults.tests
        .filter(test => !test.passed)
        .forEach(test => log(`  - ${test.name}: ${test.message}`, 'error'))
    }
    
  } catch (error) {
    log(`\n💥 Test runner error: ${error.message}`, 'error')
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('❌ This script requires Node.js 18+ with built-in fetch support', 'error')
  log('💡 Alternatively, install node-fetch: npm install node-fetch', 'warning')
  process.exit(1)
}

// Run tests
runTests().catch(error => {
  log(`💥 Unexpected error: ${error.message}`, 'error')
  process.exit(1)
})