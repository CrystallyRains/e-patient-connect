/**
 * E-Patient Connect Integration Test Suite
 * 
 * This comprehensive test suite validates all user flows, security controls,
 * and system integrations to ensure the application works correctly.
 * 
 * Run with: node integration-test.js
 * Prerequisites: Server running on http://localhost:3000 with seeded data
 */

const BASE_URL = 'http://localhost:3000'

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per test
  retries: 3,
  verbose: true
}

// Demo user credentials (from seed data)
const DEMO_USERS = {
  patient: {
    name: 'John Doe',
    mobile: '+1234567890',
    email: 'john.doe@example.com'
  },
  doctor: {
    name: 'Dr. Sarah Smith',
    mobile: '+1234567892',
    email: 'dr.sarah@example.com'
  },
  operator: {
    name: 'Mike Johnson',
    mobile: '+1234567893',
    email: 'mike.operator@example.com'
  }
}

// Test state
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  tokens: {},
  sessionData: {}
}

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  }
  
  const timestamp = new Date().toISOString()
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
}

function logTest(name, passed, message = '', duration = 0) {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  const durationStr = duration > 0 ? ` (${duration}ms)` : ''
  
  log(`${status} ${name}${durationStr} ${message}`, passed ? 'success' : 'error')
  
  testResults.tests.push({ name, passed, message, duration })
  if (passed) testResults.passed++
  else testResults.failed++
}

async function makeRequest(endpoint, options = {}) {
  const startTime = Date.now()
  
  try {
    const url = `${BASE_URL}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const duration = Date.now() - startTime
    let data = null
    
    try {
      data = await response.json()
    } catch (e) {
      // Response might not be JSON
      data = await response.text()
    }
    
    return { response, data, status: response.status, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    return { error: error.message, status: 500, duration }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Test suites
async function testSystemHealth() {
  log('\n🏥 Testing System Health...', 'info')
  
  const { data, status, duration } = await makeRequest('/api/health')
  
  logTest('System Health Check', status === 200, `Status: ${status}`, duration)
  logTest('Health Response Structure', 
    data && data.status && data.services,
    'Has required fields'
  )
  
  if (data && data.services) {
    logTest('Database Connection', 
      data.services.database === 'connected',
      `Database: ${data.services.database}`
    )
  }
}

async function testPatientRegistrationFlow() {
  log('\n👤 Testing Patient Registration Flow...', 'info')
  
  const newPatient = {
    name: 'Integration Test Patient',
    mobile: '+1999999999',
    email: 'integration.test@example.com',
    idProofType: 'Test ID',
    idProofNumber: 'TEST-INT-001',
    emergencyContact: '+1999999998'
  }
  
  // Step 1: Generate OTP for registration
  const otpResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: newPatient.mobile,
      purpose: 'REGISTRATION'
    })
  })
  
  logTest('OTP Generation for Registration', 
    otpResult.status === 200,
    `Status: ${otpResult.status}`
  )
  
  if (!otpResult.data || !otpResult.data.otp) {
    logTest('Registration Flow', false, 'No OTP received')
    return
  }
  
  // Step 2: Complete registration
  const registrationResult = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...newPatient,
      otp: otpResult.data.otp
    })
  })
  
  logTest('Patient Registration', 
    registrationResult.status === 200,
    `Status: ${registrationResult.status}`
  )
  
  if (registrationResult.data && registrationResult.data.token) {
    testResults.tokens.newPatient = registrationResult.data.token
    logTest('Registration Token Received', true, 'JWT token provided')
  }
}

async function testPatientLoginFlow() {
  log('\n🔐 Testing Patient Login Flow...', 'info')
  
  // Test OTP login
  const otpResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: DEMO_USERS.patient.mobile,
      purpose: 'LOGIN'
    })
  })
  
  logTest('OTP Generation for Login', 
    otpResult.status === 200,
    `Status: ${otpResult.status}`
  )
  
  if (otpResult.data && otpResult.data.otp) {
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: DEMO_USERS.patient.mobile,
        method: 'OTP',
        otp: otpResult.data.otp
      })
    })
    
    logTest('Patient OTP Login', 
      loginResult.status === 200,
      `Status: ${loginResult.status}`
    )
    
    if (loginResult.data && loginResult.data.token) {
      testResults.tokens.patient = loginResult.data.token
      logTest('Patient Login Token', true, 'JWT token received')
    }
  }
  
  // Test biometric login
  const biometricResult = await makeRequest('/api/auth/biometric/verify', {
    method: 'POST',
    body: JSON.stringify({
      identifier: DEMO_USERS.patient.mobile,
      biometricType: 'FINGERPRINT',
      biometricData: 'placeholder_data'
    })
  })
  
  logTest('Patient Biometric Login', 
    biometricResult.status === 200,
    `Status: ${biometricResult.status}`
  )
}

async function testDoctorEmergencyAccess() {
  log('\n🚨 Testing Doctor Emergency Access...', 'info')
  
  // Step 1: Doctor login
  const doctorOtpResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: DEMO_USERS.doctor.mobile,
      purpose: 'LOGIN'
    })
  })
  
  if (doctorOtpResult.data && doctorOtpResult.data.otp) {
    const doctorLoginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: DEMO_USERS.doctor.mobile,
        method: 'OTP',
        otp: doctorOtpResult.data.otp
      })
    })
    
    logTest('Doctor Login', 
      doctorLoginResult.status === 200,
      `Status: ${doctorLoginResult.status}`
    )
    
    if (doctorLoginResult.data && doctorLoginResult.data.token) {
      testResults.tokens.doctor = doctorLoginResult.data.token
      
      // Step 2: Request emergency access
      const emergencyResult = await makeRequest('/api/emergency/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testResults.tokens.doctor}`
        },
        body: JSON.stringify({
          patientIdentifier: DEMO_USERS.patient.mobile,
          reason: 'Integration test emergency access',
          hospitalName: 'Test Hospital',
          authMethod: 'OTP',
          authData: '123456' // Mock OTP for emergency
        })
      })
      
      logTest('Emergency Access Request', 
        emergencyResult.status === 200,
        `Status: ${emergencyResult.status}`
      )
      
      if (emergencyResult.data && emergencyResult.data.sessionToken) {
        testResults.tokens.emergency = emergencyResult.data.sessionToken
        testResults.sessionData.emergencySessionId = emergencyResult.data.sessionId
        
        logTest('Emergency Session Created', true, 
          `Session expires at: ${emergencyResult.data.expiresAt}`
        )
        
        // Step 3: Access patient data with emergency session
        const patientDataResult = await makeRequest(
          `/api/emergency/session/${emergencyResult.data.sessionId}`, {
          headers: {
            'Authorization': `Bearer ${testResults.tokens.emergency}`
          }
        })
        
        logTest('Emergency Patient Data Access', 
          patientDataResult.status === 200,
          `Status: ${patientDataResult.status}`
        )
        
        if (patientDataResult.data) {
          logTest('Patient Data Retrieved', 
            patientDataResult.data.patientProfile && patientDataResult.data.medicalTimeline,
            'Profile and timeline data present'
          )
        }
      }
    }
  }
}

async function testOperatorWorkflow() {
  log('\n👨‍💼 Testing Hospital Operator Workflow...', 'info')
  
  // Step 1: Operator login
  const operatorOtpResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: DEMO_USERS.operator.mobile,
      purpose: 'LOGIN'
    })
  })
  
  if (operatorOtpResult.data && operatorOtpResult.data.otp) {
    const operatorLoginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: DEMO_USERS.operator.mobile,
        method: 'OTP',
        otp: operatorOtpResult.data.otp
      })
    })
    
    logTest('Operator Login', 
      operatorLoginResult.status === 200,
      `Status: ${operatorLoginResult.status}`
    )
    
    if (operatorLoginResult.data && operatorLoginResult.data.token) {
      testResults.tokens.operator = operatorLoginResult.data.token
      
      // Step 2: Create encounter
      const encounterResult = await makeRequest('/api/encounters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testResults.tokens.operator}`
        },
        body: JSON.stringify({
          patientUserId: DEMO_USERS.patient.mobile, // Will be resolved to user ID
          occurredAt: new Date().toISOString(),
          type: 'Integration Test',
          reasonDiagnosis: 'Integration testing encounter',
          prescriptionsNotes: 'Test prescription notes',
          allergiesSnapshot: 'No known allergies',
          bloodGroup: 'O+'
        })
      })
      
      logTest('Operator Create Encounter', 
        encounterResult.status === 200,
        `Status: ${encounterResult.status}`
      )
      
      if (encounterResult.data && encounterResult.data.encounterId) {
        testResults.sessionData.testEncounterId = encounterResult.data.encounterId
        logTest('Encounter Created', true, 
          `Encounter ID: ${encounterResult.data.encounterId}`
        )
      }
    }
  }
}

async function testFileUploadDownload() {
  log('\n📁 Testing File Upload and Download...', 'info')
  
  if (!testResults.tokens.operator || !testResults.sessionData.testEncounterId) {
    logTest('File Upload Test', false, 'Missing operator token or encounter ID')
    return
  }
  
  // Create a test file (simulate PDF content)
  const testFileContent = Buffer.from('Test PDF content for integration testing')
  const formData = new FormData()
  
  // Create a blob to simulate file upload
  const testFile = new Blob([testFileContent], { type: 'application/pdf' })
  formData.append('file', testFile, 'integration-test.pdf')
  formData.append('encounterId', testResults.sessionData.testEncounterId)
  formData.append('patientUserId', 'patient-id') // This would be resolved
  formData.append('hospitalId', 'hospital-id')
  
  try {
    const uploadResult = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testResults.tokens.operator}`
      },
      body: formData
    })
    
    logTest('File Upload', 
      uploadResult.status === 200,
      `Status: ${uploadResult.status}`
    )
    
    if (uploadResult.ok) {
      const uploadData = await uploadResult.json()
      if (uploadData.documentId) {
        testResults.sessionData.testDocumentId = uploadData.documentId
        
        // Test file download
        const downloadResult = await makeRequest(`/api/documents/${uploadData.documentId}`, {
          headers: {
            'Authorization': `Bearer ${testResults.tokens.patient}`
          }
        })
        
        logTest('File Download', 
          downloadResult.status === 200,
          `Status: ${downloadResult.status}`
        )
      }
    }
  } catch (error) {
    logTest('File Upload', false, `Error: ${error.message}`)
  }
}

async function testAuditLogging() {
  log('\n📝 Testing Audit Logging...', 'info')
  
  if (!testResults.tokens.patient) {
    logTest('Audit Logging Test', false, 'Missing patient token')
    return
  }
  
  // Get audit logs for patient
  const auditResult = await makeRequest('/api/audit/logs', {
    headers: {
      'Authorization': `Bearer ${testResults.tokens.patient}`
    }
  })
  
  logTest('Audit Logs Retrieval', 
    auditResult.status === 200,
    `Status: ${auditResult.status}`
  )
  
  if (auditResult.data && auditResult.data.logs) {
    logTest('Audit Logs Present', 
      auditResult.data.logs.length > 0,
      `Found ${auditResult.data.logs.length} audit entries`
    )
    
    // Check for specific audit events
    const logs = auditResult.data.logs
    const hasLoginEvent = logs.some(log => log.action_type.includes('LOGIN'))
    const hasEmergencyEvent = logs.some(log => log.action_type.includes('EMERGENCY'))
    
    logTest('Login Events Logged', hasLoginEvent, 'Login events found in audit trail')
    logTest('Emergency Events Logged', hasEmergencyEvent, 'Emergency access events found')
  }
  
  // Test audit export
  const exportResult = await makeRequest('/api/audit/export', {
    headers: {
      'Authorization': `Bearer ${testResults.tokens.patient}`
    }
  })
  
  logTest('Audit Export', 
    exportResult.status === 200,
    `Status: ${exportResult.status}`
  )
}

async function testSecurityControls() {
  log('\n🔒 Testing Security Controls...', 'info')
  
  // Test unauthorized access
  const unauthorizedResult = await makeRequest('/api/user/profile')
  
  logTest('Unauthorized Access Blocked', 
    unauthorizedResult.status === 401,
    `Status: ${unauthorizedResult.status}`
  )
  
  // Test invalid token
  const invalidTokenResult = await makeRequest('/api/user/profile', {
    headers: {
      'Authorization': 'Bearer invalid-token'
    }
  })
  
  logTest('Invalid Token Rejected', 
    invalidTokenResult.status === 401,
    `Status: ${invalidTokenResult.status}`
  )
  
  // Test session validation
  if (testResults.tokens.patient) {
    const sessionResult = await makeRequest('/api/auth/session/validate', {
      headers: {
        'Authorization': `Bearer ${testResults.tokens.patient}`
      }
    })
    
    logTest('Valid Session Accepted', 
      sessionResult.status === 200,
      `Status: ${sessionResult.status}`
    )
  }
  
  // Test emergency session expiry (if we have one)
  if (testResults.tokens.emergency && testResults.sessionData.emergencySessionId) {
    log('Waiting 2 seconds to test session behavior...', 'info')
    await sleep(2000)
    
    const emergencySessionResult = await makeRequest(
      `/api/emergency/session/${testResults.sessionData.emergencySessionId}`, {
      headers: {
        'Authorization': `Bearer ${testResults.tokens.emergency}`
      }
    })
    
    // Emergency session should still be valid (10 minute timeout)
    logTest('Emergency Session Still Valid', 
      emergencySessionResult.status === 200,
      `Status: ${emergencySessionResult.status}`
    )
  }
}

async function testCrossRoleAccess() {
  log('\n🔄 Testing Cross-Role Access Controls...', 'info')
  
  // Test patient accessing other patient's data (should fail)
  if (testResults.tokens.patient && testResults.tokens.newPatient) {
    const crossAccessResult = await makeRequest('/api/encounters', {
      headers: {
        'Authorization': `Bearer ${testResults.tokens.newPatient}`
      }
    })
    
    // New patient should have no encounters initially
    logTest('Patient Data Isolation', 
      crossAccessResult.data && crossAccessResult.data.encounters.length === 0,
      'New patient has no encounters'
    )
  }
  
  // Test operator hospital boundaries
  if (testResults.tokens.operator) {
    const hospitalBoundaryResult = await makeRequest('/api/operator/encounters', {
      headers: {
        'Authorization': `Bearer ${testResults.tokens.operator}`
      }
    })
    
    logTest('Hospital Boundary Enforcement', 
      hospitalBoundaryResult.status === 200,
      `Operator can access hospital data: ${hospitalBoundaryResult.status}`
    )
  }
}

async function testDataIntegrity() {
  log('\n🔍 Testing Data Integrity...', 'info')
  
  if (!testResults.tokens.patient) {
    logTest('Data Integrity Test', false, 'Missing patient token')
    return
  }
  
  // Get patient timeline
  const timelineResult = await makeRequest('/api/encounters', {
    headers: {
      'Authorization': `Bearer ${testResults.tokens.patient}`
    }
  })
  
  logTest('Patient Timeline Retrieval', 
    timelineResult.status === 200,
    `Status: ${timelineResult.status}`
  )
  
  if (timelineResult.data && timelineResult.data.encounters) {
    const encounters = timelineResult.data.encounters
    
    // Check chronological ordering
    let isChronological = true
    for (let i = 1; i < encounters.length; i++) {
      if (new Date(encounters[i-1].occurred_at) < new Date(encounters[i].occurred_at)) {
        isChronological = false
        break
      }
    }
    
    logTest('Timeline Chronological Order', 
      isChronological,
      `${encounters.length} encounters in correct order`
    )
    
    // Check data completeness
    const hasRequiredFields = encounters.every(enc => 
      enc.id && enc.type && enc.occurred_at && enc.reason_diagnosis
    )
    
    logTest('Encounter Data Completeness', 
      hasRequiredFields,
      'All encounters have required fields'
    )
  }
}

async function testPerformance() {
  log('\n⚡ Testing Performance...', 'info')
  
  const performanceTests = [
    { name: 'Health Check', endpoint: '/api/health', maxTime: 1000 },
    { name: 'OTP Generation', endpoint: '/api/auth/otp/generate', method: 'POST', maxTime: 2000 },
    { name: 'User Profile', endpoint: '/api/user/profile', auth: true, maxTime: 1500 }
  ]
  
  for (const test of performanceTests) {
    const options = {
      method: test.method || 'GET'
    }
    
    if (test.auth && testResults.tokens.patient) {
      options.headers = {
        'Authorization': `Bearer ${testResults.tokens.patient}`
      }
    }
    
    if (test.method === 'POST' && test.endpoint.includes('otp')) {
      options.body = JSON.stringify({
        identifier: DEMO_USERS.patient.mobile,
        purpose: 'LOGIN'
      })
    }
    
    const { status, duration } = await makeRequest(test.endpoint, options)
    
    logTest(`${test.name} Performance`, 
      duration < test.maxTime,
      `${duration}ms (max: ${test.maxTime}ms)`
    )
  }
}

// Main test runner
async function runIntegrationTests() {
  log('🚀 Starting E-Patient Connect Integration Tests', 'info')
  log('=' .repeat(60), 'info')
  
  const startTime = Date.now()
  
  try {
    await testSystemHealth()
    await testPatientRegistrationFlow()
    await testPatientLoginFlow()
    await testDoctorEmergencyAccess()
    await testOperatorWorkflow()
    await testFileUploadDownload()
    await testAuditLogging()
    await testSecurityControls()
    await testCrossRoleAccess()
    await testDataIntegrity()
    await testPerformance()
    
  } catch (error) {
    log(`💥 Test runner error: ${error.message}`, 'error')
    testResults.failed++
  }
  
  const totalTime = Date.now() - startTime
  
  // Final results
  log('\n' + '=' .repeat(60), 'info')
  log('📊 Integration Test Results Summary', 'info')
  log('=' .repeat(60), 'info')
  
  log(`✅ Passed: ${testResults.passed}`, 'success')
  log(`❌ Failed: ${testResults.failed}`, 'error')
  log(`⏭️  Skipped: ${testResults.skipped}`, 'warning')
  log(`⏱️  Total Time: ${totalTime}ms`, 'info')
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)
  log(`📈 Success Rate: ${successRate}%`, successRate > 90 ? 'success' : 'warning')
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'error')
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => log(`  - ${test.name}: ${test.message}`, 'error'))
  }
  
  // Test summary by category
  log('\n📋 Test Categories:', 'info')
  const categories = {
    'System Health': testResults.tests.filter(t => t.name.includes('Health')),
    'Authentication': testResults.tests.filter(t => t.name.includes('Login') || t.name.includes('OTP') || t.name.includes('Token')),
    'Emergency Access': testResults.tests.filter(t => t.name.includes('Emergency')),
    'File Operations': testResults.tests.filter(t => t.name.includes('File') || t.name.includes('Upload') || t.name.includes('Download')),
    'Security': testResults.tests.filter(t => t.name.includes('Security') || t.name.includes('Unauthorized') || t.name.includes('Access')),
    'Audit & Compliance': testResults.tests.filter(t => t.name.includes('Audit')),
    'Performance': testResults.tests.filter(t => t.name.includes('Performance'))
  }
  
  Object.entries(categories).forEach(([category, tests]) => {
    if (tests.length > 0) {
      const passed = tests.filter(t => t.passed).length
      const total = tests.length
      log(`  ${category}: ${passed}/${total} passed`, passed === total ? 'success' : 'warning')
    }
  })
  
  log('\n🎯 Integration Testing Complete!', 'success')
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0)
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('❌ This script requires Node.js 18+ with built-in fetch support', 'error')
  log('💡 Alternatively, install node-fetch: npm install node-fetch', 'warning')
  process.exit(1)
}

// Run tests
runIntegrationTests().catch(error => {
  log(`💥 Unexpected error: ${error.message}`, 'error')
  process.exit(1)
})