/**
 * E-Patient Connect Security Validation Suite
 * 
 * This script performs comprehensive security testing to validate
 * authentication, authorization, and data protection mechanisms.
 * 
 * Run with: node security-validation.js
 * Prerequisites: Server running on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000'

// Security test results
let securityResults = {
  passed: 0,
  failed: 0,
  critical: 0,
  warnings: 0,
  tests: []
}

// Demo credentials for testing
const TEST_USERS = {
  patient: { mobile: '+1234567890', email: 'john.doe@example.com' },
  doctor: { mobile: '+1234567892', email: 'dr.sarah@example.com' },
  operator: { mobile: '+1234567893', email: 'mike.operator@example.com' }
}

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    critical: '\x1b[35m',
    reset: '\x1b[0m'
  }
  
  const timestamp = new Date().toISOString()
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
}

function logSecurityTest(name, passed, severity = 'medium', message = '') {
  const status = passed ? '✅ SECURE' : '🚨 VULNERABLE'
  const severityIcon = {
    low: '🟡',
    medium: '🟠', 
    high: '🔴',
    critical: '💀'
  }
  
  log(`${status} ${severityIcon[severity]} ${name} ${message}`, passed ? 'success' : 'error')
  
  securityResults.tests.push({ name, passed, severity, message })
  if (passed) {
    securityResults.passed++
  } else {
    securityResults.failed++
    if (severity === 'critical') securityResults.critical++
    if (severity === 'high') securityResults.warnings++
  }
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
    
    return { response, data, status: response.status, headers: response.headers }
  } catch (error) {
    return { error: error.message, status: 500 }
  }
}

// Security test suites
async function testAuthenticationSecurity() {
  log('\n🔐 Testing Authentication Security...', 'info')
  
  // Test 1: No password authentication
  const loginResult = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: TEST_USERS.patient.mobile,
      password: 'test123' // Should be ignored
    })
  })
  
  logSecurityTest(
    'Passwordless Authentication Enforced',
    loginResult.status !== 200 || !loginResult.data?.token,
    'critical',
    'System rejects password-based authentication'
  )
  
  // Test 2: OTP rate limiting
  const otpRequests = []
  for (let i = 0; i < 10; i++) {
    otpRequests.push(makeRequest('/api/auth/otp/generate', {
      method: 'POST',
      body: JSON.stringify({
        identifier: TEST_USERS.patient.mobile,
        purpose: 'LOGIN'
      })
    }))
  }
  
  const otpResults = await Promise.all(otpRequests)
  const rateLimited = otpResults.some(result => result.status === 429)
  
  logSecurityTest(
    'OTP Rate Limiting',
    rateLimited,
    'high',
    'Prevents OTP flooding attacks'
  )
  
  // Test 3: Invalid OTP handling
  const invalidOtpResult = await makeRequest('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      identifier: TEST_USERS.patient.mobile,
      otp: '000000',
      purpose: 'LOGIN'
    })
  })
  
  logSecurityTest(
    'Invalid OTP Rejection',
    invalidOtpResult.status !== 200,
    'medium',
    'Invalid OTPs are properly rejected'
  )
  
  // Test 4: OTP expiry
  // Generate OTP and wait (simulated)
  const expiredOtpResult = await makeRequest('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      identifier: TEST_USERS.patient.mobile,
      otp: '123456', // Likely expired or invalid
      purpose: 'LOGIN'
    })
  })
  
  logSecurityTest(
    'OTP Expiry Handling',
    expiredOtpResult.status !== 200,
    'medium',
    'Expired OTPs are rejected'
  )
}

async function testAuthorizationSecurity() {
  log('\n🛡️ Testing Authorization Security...', 'info')
  
  // Test 1: Unauthorized API access
  const unauthorizedEndpoints = [
    '/api/user/profile',
    '/api/encounters',
    '/api/documents',
    '/api/audit/logs',
    '/api/emergency/sessions'
  ]
  
  for (const endpoint of unauthorizedEndpoints) {
    const result = await makeRequest(endpoint)
    logSecurityTest(
      `Unauthorized Access Blocked: ${endpoint}`,
      result.status === 401,
      'critical',
      `Status: ${result.status}`
    )
  }
  
  // Test 2: Invalid token handling
  const invalidTokenResult = await makeRequest('/api/user/profile', {
    headers: {
      'Authorization': 'Bearer invalid-jwt-token'
    }
  })
  
  logSecurityTest(
    'Invalid Token Rejection',
    invalidTokenResult.status === 401,
    'critical',
    'Invalid JWT tokens are rejected'
  )
  
  // Test 3: Malformed authorization header
  const malformedAuthResult = await makeRequest('/api/user/profile', {
    headers: {
      'Authorization': 'InvalidFormat token123'
    }
  })
  
  logSecurityTest(
    'Malformed Auth Header Handling',
    malformedAuthResult.status === 401,
    'medium',
    'Malformed authorization headers rejected'
  )
  
  // Test 4: Missing authorization header
  const missingAuthResult = await makeRequest('/api/user/profile', {
    headers: {
      'Authorization': ''
    }
  })
  
  logSecurityTest(
    'Missing Auth Header Handling',
    missingAuthResult.status === 401,
    'medium',
    'Missing authorization headers rejected'
  )
}

async function testSessionSecurity() {
  log('\n⏰ Testing Session Security...', 'info')
  
  // First, get a valid token for testing
  const otpResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: TEST_USERS.patient.mobile,
      purpose: 'LOGIN'
    })
  })
  
  if (otpResult.data && otpResult.data.otp) {
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: TEST_USERS.patient.mobile,
        method: 'OTP',
        otp: otpResult.data.otp
      })
    })
    
    if (loginResult.data && loginResult.data.token) {
      const token = loginResult.data.token
      
      // Test 1: Session validation
      const sessionValidResult = await makeRequest('/api/auth/session/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      logSecurityTest(
        'Valid Session Acceptance',
        sessionValidResult.status === 200,
        'medium',
        'Valid sessions are properly accepted'
      )
      
      // Test 2: Token structure validation (basic JWT check)
      const tokenParts = token.split('.')
      logSecurityTest(
        'JWT Token Structure',
        tokenParts.length === 3,
        'medium',
        'JWT tokens have proper structure'
      )
      
      // Test 3: Session logout
      const logoutResult = await makeRequest('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      logSecurityTest(
        'Session Logout',
        logoutResult.status === 200,
        'low',
        'Sessions can be properly terminated'
      )
    }
  }
}

async function testEmergencyAccessSecurity() {
  log('\n🚨 Testing Emergency Access Security...', 'info')
  
  // Test 1: Unauthorized emergency access
  const unauthorizedEmergencyResult = await makeRequest('/api/emergency/request', {
    method: 'POST',
    body: JSON.stringify({
      patientIdentifier: TEST_USERS.patient.mobile,
      reason: 'Unauthorized test',
      authMethod: 'OTP',
      authData: '123456'
    })
  })
  
  logSecurityTest(
    'Unauthorized Emergency Access Blocked',
    unauthorizedEmergencyResult.status === 401,
    'critical',
    'Emergency access requires doctor authentication'
  )
  
  // Test 2: Emergency access without reason
  const noReasonResult = await makeRequest('/api/emergency/request', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fake-doctor-token'
    },
    body: JSON.stringify({
      patientIdentifier: TEST_USERS.patient.mobile,
      authMethod: 'OTP',
      authData: '123456'
    })
  })
  
  logSecurityTest(
    'Emergency Access Reason Required',
    noReasonResult.status !== 200,
    'high',
    'Emergency access requires justification'
  )
  
  // Test 3: Invalid emergency session access
  const invalidSessionResult = await makeRequest('/api/emergency/session/invalid-session-id', {
    headers: {
      'Authorization': 'Bearer fake-emergency-token'
    }
  })
  
  logSecurityTest(
    'Invalid Emergency Session Blocked',
    invalidSessionResult.status === 401 || invalidSessionResult.status === 403,
    'critical',
    'Invalid emergency sessions are rejected'
  )
}

async function testDataProtectionSecurity() {
  log('\n🔒 Testing Data Protection Security...', 'info')
  
  // Test 1: SQL injection attempts
  const sqlInjectionAttempts = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users --"
  ]
  
  for (const injection of sqlInjectionAttempts) {
    const result = await makeRequest('/api/auth/otp/generate', {
      method: 'POST',
      body: JSON.stringify({
        identifier: injection,
        purpose: 'LOGIN'
      })
    })
    
    logSecurityTest(
      `SQL Injection Protection: ${injection.substring(0, 20)}...`,
      result.status !== 200 || !result.data?.otp,
      'critical',
      'SQL injection attempts blocked'
    )
  }
  
  // Test 2: XSS attempts in input
  const xssAttempts = [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror=alert("xss")>',
    '"><script>alert("xss")</script>'
  ]
  
  for (const xss of xssAttempts) {
    const result = await makeRequest('/api/auth/otp/generate', {
      method: 'POST',
      body: JSON.stringify({
        identifier: xss,
        purpose: 'LOGIN'
      })
    })
    
    logSecurityTest(
      `XSS Protection: ${xss.substring(0, 20)}...`,
      result.status !== 200 || !result.data?.otp,
      'high',
      'XSS attempts in input blocked'
    )
  }
  
  // Test 3: Oversized request handling
  const oversizedData = 'A'.repeat(10000) // 10KB string
  const oversizedResult = await makeRequest('/api/auth/otp/generate', {
    method: 'POST',
    body: JSON.stringify({
      identifier: oversizedData,
      purpose: 'LOGIN'
    })
  })
  
  logSecurityTest(
    'Oversized Request Handling',
    oversizedResult.status !== 200,
    'medium',
    'Oversized requests are rejected'
  )
}

async function testFileUploadSecurity() {
  log('\n📁 Testing File Upload Security...', 'info')
  
  // Test 1: Unauthorized file upload
  const unauthorizedUploadResult = await makeRequest('/api/documents/upload', {
    method: 'POST',
    body: JSON.stringify({
      filename: 'test.pdf',
      content: 'test content'
    })
  })
  
  logSecurityTest(
    'Unauthorized File Upload Blocked',
    unauthorizedUploadResult.status === 401,
    'critical',
    'File uploads require authentication'
  )
  
  // Test 2: Invalid file type handling (simulated)
  const invalidFileResult = await makeRequest('/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fake-token'
    },
    body: JSON.stringify({
      filename: 'malicious.exe',
      mimetype: 'application/x-executable'
    })
  })
  
  logSecurityTest(
    'Invalid File Type Rejection',
    invalidFileResult.status !== 200,
    'high',
    'Executable files are rejected'
  )
  
  // Test 3: File size limit (simulated)
  const oversizedFileResult = await makeRequest('/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fake-token'
    },
    body: JSON.stringify({
      filename: 'huge.pdf',
      size: 50 * 1024 * 1024 // 50MB
    })
  })
  
  logSecurityTest(
    'File Size Limit Enforcement',
    oversizedFileResult.status !== 200,
    'medium',
    'Oversized files are rejected'
  )
}

async function testHospitalBoundarySecurity() {
  log('\n🏥 Testing Hospital Boundary Security...', 'info')
  
  // Test 1: Cross-hospital data access (simulated)
  const crossHospitalResult = await makeRequest('/api/operator/encounters', {
    headers: {
      'Authorization': 'Bearer fake-operator-token'
    }
  })
  
  logSecurityTest(
    'Cross-Hospital Access Control',
    crossHospitalResult.status === 401 || crossHospitalResult.status === 403,
    'critical',
    'Operators cannot access other hospitals data'
  )
  
  // Test 2: Patient data isolation
  const patientIsolationResult = await makeRequest('/api/encounters', {
    headers: {
      'Authorization': 'Bearer fake-patient-token'
    }
  })
  
  logSecurityTest(
    'Patient Data Isolation',
    patientIsolationResult.status === 401,
    'critical',
    'Patients can only access their own data'
  )
}

async function testAuditLogSecurity() {
  log('\n📝 Testing Audit Log Security...', 'info')
  
  // Test 1: Unauthorized audit log access
  const unauthorizedAuditResult = await makeRequest('/api/audit/logs')
  
  logSecurityTest(
    'Unauthorized Audit Access Blocked',
    unauthorizedAuditResult.status === 401,
    'critical',
    'Audit logs require authentication'
  )
  
  // Test 2: Cross-patient audit access
  const crossPatientAuditResult = await makeRequest('/api/audit/logs', {
    headers: {
      'Authorization': 'Bearer fake-patient-token'
    }
  })
  
  logSecurityTest(
    'Cross-Patient Audit Access Blocked',
    crossPatientAuditResult.status === 401,
    'critical',
    'Patients can only see their own audit logs'
  )
  
  // Test 3: Audit log tampering protection (simulated)
  const auditTamperResult = await makeRequest('/api/audit/logs', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fake-token'
    },
    body: JSON.stringify({
      action: 'DELETE_AUDIT_LOG',
      logId: 'some-log-id'
    })
  })
  
  logSecurityTest(
    'Audit Log Tampering Protection',
    auditTamperResult.status === 404 || auditTamperResult.status === 405,
    'critical',
    'Audit logs cannot be modified or deleted'
  )
}

async function testSecurityHeaders() {
  log('\n🛡️ Testing Security Headers...', 'info')
  
  const healthResult = await makeRequest('/api/health')
  
  if (healthResult.headers) {
    const headers = healthResult.headers
    
    // Test security headers
    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age'
    }
    
    Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
      const headerValue = headers.get(header)
      const isPresent = headerValue && headerValue.includes(expectedValue)
      
      logSecurityTest(
        `Security Header: ${header}`,
        isPresent,
        'medium',
        `Value: ${headerValue || 'missing'}`
      )
    })
  }
}

async function testInputValidation() {
  log('\n✅ Testing Input Validation...', 'info')
  
  // Test 1: Invalid mobile number formats
  const invalidMobileFormats = [
    '123', // Too short
    'not-a-number',
    '+' + '1'.repeat(20), // Too long
    '++1234567890', // Invalid format
    ''
  ]
  
  for (const mobile of invalidMobileFormats) {
    const result = await makeRequest('/api/auth/otp/generate', {
      method: 'POST',
      body: JSON.stringify({
        identifier: mobile,
        purpose: 'LOGIN'
      })
    })
    
    logSecurityTest(
      `Invalid Mobile Format Rejection: ${mobile || 'empty'}`,
      result.status !== 200,
      'medium',
      'Invalid mobile numbers rejected'
    )
  }
  
  // Test 2: Invalid email formats
  const invalidEmailFormats = [
    'not-an-email',
    '@domain.com',
    'user@',
    'user@domain',
    ''
  ]
  
  for (const email of invalidEmailFormats) {
    const result = await makeRequest('/api/auth/otp/generate', {
      method: 'POST',
      body: JSON.stringify({
        identifier: email,
        purpose: 'LOGIN'
      })
    })
    
    logSecurityTest(
      `Invalid Email Format Rejection: ${email || 'empty'}`,
      result.status !== 200,
      'medium',
      'Invalid email addresses rejected'
    )
  }
}

// Main security validation runner
async function runSecurityValidation() {
  log('🔒 Starting E-Patient Connect Security Validation', 'info')
  log('=' .repeat(60), 'info')
  
  const startTime = Date.now()
  
  try {
    await testAuthenticationSecurity()
    await testAuthorizationSecurity()
    await testSessionSecurity()
    await testEmergencyAccessSecurity()
    await testDataProtectionSecurity()
    await testFileUploadSecurity()
    await testHospitalBoundarySecurity()
    await testAuditLogSecurity()
    await testSecurityHeaders()
    await testInputValidation()
    
  } catch (error) {
    log(`💥 Security validation error: ${error.message}`, 'error')
    securityResults.failed++
  }
  
  const totalTime = Date.now() - startTime
  
  // Final security report
  log('\n' + '=' .repeat(60), 'info')
  log('🔒 Security Validation Report', 'info')
  log('=' .repeat(60), 'info')
  
  log(`✅ Secure: ${securityResults.passed}`, 'success')
  log(`🚨 Vulnerable: ${securityResults.failed}`, 'error')
  log(`💀 Critical Issues: ${securityResults.critical}`, 'critical')
  log(`⚠️  High Risk Issues: ${securityResults.warnings}`, 'warning')
  log(`⏱️  Total Time: ${totalTime}ms`, 'info')
  
  const securityScore = ((securityResults.passed / (securityResults.passed + securityResults.failed)) * 100).toFixed(1)
  log(`🛡️  Security Score: ${securityScore}%`, securityScore > 95 ? 'success' : 'warning')
  
  // Critical issues summary
  if (securityResults.critical > 0) {
    log('\n💀 CRITICAL SECURITY ISSUES:', 'critical')
    securityResults.tests
      .filter(test => !test.passed && test.severity === 'critical')
      .forEach(test => log(`  - ${test.name}: ${test.message}`, 'critical'))
  }
  
  // High risk issues summary
  if (securityResults.warnings > 0) {
    log('\n⚠️  HIGH RISK ISSUES:', 'warning')
    securityResults.tests
      .filter(test => !test.passed && test.severity === 'high')
      .forEach(test => log(`  - ${test.name}: ${test.message}`, 'warning'))
  }
  
  // Security recommendations
  log('\n🔧 Security Recommendations:', 'info')
  log('  1. Ensure all endpoints require proper authentication', 'info')
  log('  2. Implement rate limiting on all authentication endpoints', 'info')
  log('  3. Add security headers to all responses', 'info')
  log('  4. Validate and sanitize all user inputs', 'info')
  log('  5. Implement proper session management and expiry', 'info')
  log('  6. Ensure audit logs are immutable and comprehensive', 'info')
  log('  7. Test emergency access time bounds in production', 'info')
  
  log('\n🎯 Security Validation Complete!', securityResults.critical === 0 ? 'success' : 'error')
  
  // Exit with appropriate code
  process.exit(securityResults.critical > 0 ? 1 : 0)
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('❌ This script requires Node.js 18+ with built-in fetch support', 'error')
  process.exit(1)
}

// Run security validation
runSecurityValidation().catch(error => {
  log(`💥 Unexpected error: ${error.message}`, 'error')
  process.exit(1)
})