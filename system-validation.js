/**
 * E-Patient Connect System Validation Suite
 * 
 * This script performs comprehensive system validation to ensure
 * all components are working correctly and the system is ready for use.
 * 
 * Run with: node system-validation.js
 * Prerequisites: Server running on http://localhost:3000 with seeded data
 */

const BASE_URL = 'http://localhost:3000'

// System validation results
let validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  components: {},
  tests: []
}

// Component status tracking
const COMPONENTS = {
  'Database': { status: 'unknown', tests: [] },
  'Authentication': { status: 'unknown', tests: [] },
  'User Management': { status: 'unknown', tests: [] },
  'Medical Timeline': { status: 'unknown', tests: [] },
  'Emergency Access': { status: 'unknown', tests: [] },
  'Document Management': { status: 'unknown', tests: [] },
  'Audit Logging': { status: 'unknown', tests: [] },
  'Security': { status: 'unknown', tests: [] },
  'API Endpoints': { status: 'unknown', tests: [] },
  'Frontend': { status: 'unknown', tests: [] }
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

function logValidation(component, testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  log(`${status} [${component}] ${testName} ${message}`, passed ? 'success' : 'error')
  
  // Update component tracking
  if (!COMPONENTS[component]) {
    COMPONENTS[component] = { status: 'unknown', tests: [] }
  }
  
  COMPONENTS[component].tests.push({ name: testName, passed, message })
  validationResults.tests.push({ component, name: testName, passed, message })
  
  if (passed) validationResults.passed++
  else validationResults.failed++
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
    
    let data = null
    try {
      data = await response.json()
    } catch (e) {
      data = await response.text()
    }
    
    return { response, data, status: response.status }
  } catch (error) {
    return { error: error.message, status: 500 }
  }
}

// Component validation functions
async function validateDatabase() {
  log('\n🗄️ Validating Database Component...', 'info')
  
  // Test database connection via health check
  const healthResult = await makeRequest('/api/health')
  
  logValidation('Database', 'Connection Test', 
    healthResult.status === 200 && healthResult.data?.services?.database === 'connected',
    `Health check status: ${healthResult.status}`
  )
  
  // Test database schema by checking if we can query users
  const statusResult = await makeRequest('/api/status')
  
  logValidation('Database', 'Schema Validation',
    statusResult.status === 200,
    'System status endpoint accessible'
  )
  
  // Update component status
  const dbTests = COMPONENTS['Database'].tests
  COMPONENTS['Database'].status = dbTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateAuthentication() {
  log('\n🔐 Validating Authentication Component...', 'info')
  
  // Test OTP generation
  const otpResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '+1234567890',
      purpose: 'LOGIN'
    })
  })
  
  logValidation('Authentication', 'OTP Generation',
    otpResult.status === 200 && otpResult.data?.message,
    `Status: ${otpResult.status}`
  )
  
  // Test biometric endpoint
  const biometricResult = await makeRequest('/api/auth/biometric/verify', {
    method: 'POST',
    body: JSON.stringify({
      identifier: '+1234567890',
      biometricType: 'FINGERPRINT',
      biometricData: 'test'
    })
  })
  
  logValidation('Authentication', 'Biometric Endpoint',
    biometricResult.status === 200 || biometricResult.status === 400,
    'Biometric verification endpoint responds'
  )
  
  // Test session validation endpoint
  const sessionResult = await makeRequest('/api/auth/session/validate')
  
  logValidation('Authentication', 'Session Validation',
    sessionResult.status === 401, // Should require auth
    'Session validation requires authentication'
  )
  
  // Update component status
  const authTests = COMPONENTS['Authentication'].tests
  COMPONENTS['Authentication'].status = authTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateUserManagement() {
  log('\n👥 Validating User Management Component...', 'info')
  
  // Test user profile endpoint (should require auth)
  const profileResult = await makeRequest('/api/user/profile')
  
  logValidation('User Management', 'Profile Endpoint Security',
    profileResult.status === 401,
    'Profile endpoint requires authentication'
  )
  
  // Test registration endpoint
  const registerResult = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      mobile: '+1999999999',
      email: 'test@example.com'
    })
  })
  
  logValidation('User Management', 'Registration Endpoint',
    registerResult.status === 400 || registerResult.status === 200,
    'Registration endpoint responds to requests'
  )
  
  // Update component status
  const userTests = COMPONENTS['User Management'].tests
  COMPONENTS['User Management'].status = userTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateMedicalTimeline() {
  log('\n📋 Validating Medical Timeline Component...', 'info')
  
  // Test encounters endpoint (should require auth)
  const encountersResult = await makeRequest('/api/encounters')
  
  logValidation('Medical Timeline', 'Encounters Endpoint Security',
    encountersResult.status === 401,
    'Encounters endpoint requires authentication'
  )
  
  // Test patient critical info endpoint
  const criticalInfoResult = await makeRequest('/api/patient/critical-info')
  
  logValidation('Medical Timeline', 'Critical Info Endpoint',
    criticalInfoResult.status === 401,
    'Critical info endpoint requires authentication'
  )
  
  // Test patient stats endpoint
  const statsResult = await makeRequest('/api/patient/stats')
  
  logValidation('Medical Timeline', 'Patient Stats Endpoint',
    statsResult.status === 401,
    'Patient stats endpoint requires authentication'
  )
  
  // Update component status
  const timelineTests = COMPONENTS['Medical Timeline'].tests
  COMPONENTS['Medical Timeline'].status = timelineTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateEmergencyAccess() {
  log('\n🚨 Validating Emergency Access Component...', 'info')
  
  // Test emergency request endpoint (should require auth)
  const emergencyResult = await makeRequest('/api/emergency/request', {
    method: 'POST',
    body: JSON.stringify({
      patientIdentifier: '+1234567890',
      reason: 'Test emergency'
    })
  })
  
  logValidation('Emergency Access', 'Emergency Request Security',
    emergencyResult.status === 401,
    'Emergency request requires doctor authentication'
  )
  
  // Test emergency sessions endpoint
  const sessionsResult = await makeRequest('/api/emergency/sessions')
  
  logValidation('Emergency Access', 'Emergency Sessions Endpoint',
    sessionsResult.status === 401,
    'Emergency sessions endpoint requires authentication'
  )
  
  // Test invalid emergency session access
  const invalidSessionResult = await makeRequest('/api/emergency/session/invalid-id')
  
  logValidation('Emergency Access', 'Invalid Session Handling',
    invalidSessionResult.status === 401 || invalidSessionResult.status === 403,
    'Invalid emergency sessions are rejected'
  )
  
  // Update component status
  const emergencyTests = COMPONENTS['Emergency Access'].tests
  COMPONENTS['Emergency Access'].status = emergencyTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateDocumentManagement() {
  log('\n📁 Validating Document Management Component...', 'info')
  
  // Test documents endpoint (should require auth)
  const documentsResult = await makeRequest('/api/documents')
  
  logValidation('Document Management', 'Documents Endpoint Security',
    documentsResult.status === 401,
    'Documents endpoint requires authentication'
  )
  
  // Test document upload endpoint
  const uploadResult = await makeRequest('/api/documents/upload', {
    method: 'POST'
  })
  
  logValidation('Document Management', 'Upload Endpoint Security',
    uploadResult.status === 401,
    'Upload endpoint requires authentication'
  )
  
  // Test document stats endpoint
  const docStatsResult = await makeRequest('/api/documents/stats')
  
  logValidation('Document Management', 'Document Stats Endpoint',
    docStatsResult.status === 401,
    'Document stats endpoint requires authentication'
  )
  
  // Update component status
  const docTests = COMPONENTS['Document Management'].tests
  COMPONENTS['Document Management'].status = docTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateAuditLogging() {
  log('\n📝 Validating Audit Logging Component...', 'info')
  
  // Test audit logs endpoint (should require auth)
  const auditResult = await makeRequest('/api/audit/logs')
  
  logValidation('Audit Logging', 'Audit Logs Endpoint Security',
    auditResult.status === 401,
    'Audit logs endpoint requires authentication'
  )
  
  // Test audit stats endpoint
  const auditStatsResult = await makeRequest('/api/audit/stats')
  
  logValidation('Audit Logging', 'Audit Stats Endpoint',
    auditStatsResult.status === 401,
    'Audit stats endpoint requires authentication'
  )
  
  // Test audit export endpoint
  const exportResult = await makeRequest('/api/audit/export')
  
  logValidation('Audit Logging', 'Audit Export Endpoint',
    exportResult.status === 401,
    'Audit export endpoint requires authentication'
  )
  
  // Test emergency audit endpoint
  const emergencyAuditResult = await makeRequest('/api/audit/emergency')
  
  logValidation('Audit Logging', 'Emergency Audit Endpoint',
    emergencyAuditResult.status === 401,
    'Emergency audit endpoint requires authentication'
  )
  
  // Update component status
  const auditTests = COMPONENTS['Audit Logging'].tests
  COMPONENTS['Audit Logging'].status = auditTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateSecurity() {
  log('\n🛡️ Validating Security Component...', 'info')
  
  // Test unauthorized access to protected endpoints
  const protectedEndpoints = [
    '/api/user/profile',
    '/api/encounters',
    '/api/documents',
    '/api/audit/logs',
    '/api/emergency/sessions'
  ]
  
  let securityPassed = 0
  for (const endpoint of protectedEndpoints) {
    const result = await makeRequest(endpoint)
    if (result.status === 401) securityPassed++
  }
  
  logValidation('Security', 'Protected Endpoints',
    securityPassed === protectedEndpoints.length,
    `${securityPassed}/${protectedEndpoints.length} endpoints properly secured`
  )
  
  // Test invalid token handling
  const invalidTokenResult = await makeRequest('/api/user/profile', {
    headers: {
      'Authorization': 'Bearer invalid-token'
    }
  })
  
  logValidation('Security', 'Invalid Token Handling',
    invalidTokenResult.status === 401,
    'Invalid tokens are properly rejected'
  )
  
  // Test malformed requests
  const malformedResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: 'invalid-json'
  })
  
  logValidation('Security', 'Malformed Request Handling',
    malformedResult.status === 400 || malformedResult.status === 500,
    'Malformed requests are handled gracefully'
  )
  
  // Update component status
  const securityTests = COMPONENTS['Security'].tests
  COMPONENTS['Security'].status = securityTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateAPIEndpoints() {
  log('\n🔌 Validating API Endpoints...', 'info')
  
  // Test system health endpoint
  const healthResult = await makeRequest('/api/health')
  
  logValidation('API Endpoints', 'Health Check Endpoint',
    healthResult.status === 200,
    `Status: ${healthResult.status}`
  )
  
  // Test system status endpoint
  const statusResult = await makeRequest('/api/status')
  
  logValidation('API Endpoints', 'System Status Endpoint',
    statusResult.status === 200,
    `Status: ${statusResult.status}`
  )
  
  // Test API index endpoint
  const apiIndexResult = await makeRequest('/api')
  
  logValidation('API Endpoints', 'API Index Endpoint',
    apiIndexResult.status === 200,
    'API index provides endpoint listing'
  )
  
  // Test operator endpoints
  const operatorResult = await makeRequest('/api/operator/encounters')
  
  logValidation('API Endpoints', 'Operator Endpoints',
    operatorResult.status === 401,
    'Operator endpoints require authentication'
  )
  
  // Update component status
  const apiTests = COMPONENTS['API Endpoints'].tests
  COMPONENTS['API Endpoints'].status = apiTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function validateFrontend() {
  log('\n🌐 Validating Frontend Component...', 'info')
  
  // Test main landing page
  const landingResult = await makeRequest('/')
  
  logValidation('Frontend', 'Landing Page',
    landingResult.status === 200,
    `Status: ${landingResult.status}`
  )
  
  // Test patient pages (should return HTML)
  const patientLoginResult = await makeRequest('/patient/login')
  
  logValidation('Frontend', 'Patient Login Page',
    patientLoginResult.status === 200,
    'Patient login page accessible'
  )
  
  // Test doctor pages
  const doctorEmergencyResult = await makeRequest('/doctor/emergency')
  
  logValidation('Frontend', 'Doctor Emergency Page',
    doctorEmergencyResult.status === 200,
    'Doctor emergency page accessible'
  )
  
  // Test operator pages
  const operatorLoginResult = await makeRequest('/operator/login')
  
  logValidation('Frontend', 'Operator Login Page',
    operatorLoginResult.status === 200,
    'Operator login page accessible'
  )
  
  // Test development credentials page (if in dev mode)
  const devCredentialsResult = await makeRequest('/dev-credentials')
  
  logValidation('Frontend', 'Dev Credentials Page',
    devCredentialsResult.status === 200,
    'Development credentials page accessible'
  )
  
  // Update component status
  const frontendTests = COMPONENTS['Frontend'].tests
  COMPONENTS['Frontend'].status = frontendTests.every(t => t.passed) ? 'healthy' : 'unhealthy'
}

async function generateSystemReport() {
  log('\n📊 Generating System Report...', 'info')
  
  // Calculate overall system health
  const totalComponents = Object.keys(COMPONENTS).length
  const healthyComponents = Object.values(COMPONENTS).filter(c => c.status === 'healthy').length
  const systemHealth = (healthyComponents / totalComponents * 100).toFixed(1)
  
  // Generate component status summary
  log('\n' + '=' .repeat(60), 'info')
  log('🏥 E-Patient Connect System Validation Report', 'info')
  log('=' .repeat(60), 'info')
  
  log(`📈 Overall System Health: ${systemHealth}%`, systemHealth > 90 ? 'success' : 'warning')
  log(`✅ Tests Passed: ${validationResults.passed}`, 'success')
  log(`❌ Tests Failed: ${validationResults.failed}`, 'error')
  log(`⚠️  Warnings: ${validationResults.warnings}`, 'warning')
  
  log('\n🔧 Component Status:', 'info')
  Object.entries(COMPONENTS).forEach(([name, component]) => {
    const statusIcon = component.status === 'healthy' ? '✅' : '❌'
    const passedTests = component.tests.filter(t => t.passed).length
    const totalTests = component.tests.length
    
    log(`  ${statusIcon} ${name}: ${passedTests}/${totalTests} tests passed`, 
      component.status === 'healthy' ? 'success' : 'error')
  })
  
  // Failed tests summary
  if (validationResults.failed > 0) {
    log('\n❌ Failed Tests:', 'error')
    validationResults.tests
      .filter(test => !test.passed)
      .forEach(test => log(`  - [${test.component}] ${test.name}: ${test.message}`, 'error'))
  }
  
  // System readiness assessment
  log('\n🎯 System Readiness Assessment:', 'info')
  
  const criticalComponents = ['Database', 'Authentication', 'Security', 'API Endpoints']
  const criticalHealthy = criticalComponents.every(comp => COMPONENTS[comp].status === 'healthy')
  
  if (criticalHealthy) {
    log('✅ System is ready for use', 'success')
    log('  - All critical components are healthy', 'success')
    log('  - Authentication and security are working', 'success')
    log('  - Database connectivity confirmed', 'success')
    log('  - API endpoints are responding correctly', 'success')
  } else {
    log('❌ System is NOT ready for use', 'error')
    log('  - Critical component failures detected', 'error')
    log('  - Please resolve issues before proceeding', 'error')
  }
  
  // Recommendations
  log('\n💡 Recommendations:', 'info')
  
  if (COMPONENTS['Database'].status !== 'healthy') {
    log('  - Check database connection and run: npm run db:init', 'warning')
  }
  
  if (COMPONENTS['Authentication'].status !== 'healthy') {
    log('  - Verify authentication services are properly configured', 'warning')
  }
  
  if (COMPONENTS['Security'].status !== 'healthy') {
    log('  - Review security configurations and access controls', 'warning')
  }
  
  if (systemHealth < 90) {
    log('  - Run integration tests: node integration-test.js', 'warning')
    log('  - Run security validation: node security-validation.js', 'warning')
  }
  
  log('  - Check server logs for any error messages', 'info')
  log('  - Ensure all environment variables are properly set', 'info')
  log('  - Verify demo data is seeded: npm run db:seed', 'info')
  
  return systemHealth > 90 && criticalHealthy
}

// Main system validation runner
async function runSystemValidation() {
  log('🔍 Starting E-Patient Connect System Validation', 'info')
  log('=' .repeat(60), 'info')
  
  const startTime = Date.now()
  
  try {
    await validateDatabase()
    await validateAuthentication()
    await validateUserManagement()
    await validateMedicalTimeline()
    await validateEmergencyAccess()
    await validateDocumentManagement()
    await validateAuditLogging()
    await validateSecurity()
    await validateAPIEndpoints()
    await validateFrontend()
    
    const systemReady = await generateSystemReport()
    
    const totalTime = Date.now() - startTime
    log(`\n⏱️  Total Validation Time: ${totalTime}ms`, 'info')
    
    log('\n🎉 System Validation Complete!', systemReady ? 'success' : 'warning')
    
    // Exit with appropriate code
    process.exit(systemReady ? 0 : 1)
    
  } catch (error) {
    log(`💥 System validation error: ${error.message}`, 'error')
    validationResults.failed++
    process.exit(1)
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('❌ This script requires Node.js 18+ with built-in fetch support', 'error')
  process.exit(1)
}

// Run system validation
runSystemValidation().catch(error => {
  log(`💥 Unexpected error: ${error.message}`, 'error')
  process.exit(1)
})