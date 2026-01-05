import { database } from '../database'

export interface DemoUser {
  id: string
  role: string
  name: string
  mobile: string
  email: string
  hospital_name?: string
}

export interface DevSetupInfo {
  users: {
    patients: DemoUser[]
    doctors: DemoUser[]
    operators: DemoUser[]
  }
  hospitals: Array<{ id: string; name: string }>
  features: {
    otpDisplay: boolean
    biometricPlaceholders: boolean
    emergencyAccess: boolean
    auditLogging: boolean
    developmentMode: boolean
  }
  testScenarios: Array<{
    title: string
    description: string
    steps: string[]
  }>
}

/**
 * Get comprehensive development setup information
 */
export async function getDevSetupInfo(): Promise<DevSetupInfo> {
  try {
    // Get all users with hospital information
    const [allUsers] = await database.execute(`
      SELECT u.*, h.name as hospital_name 
      FROM users u 
      LEFT JOIN hospitals h ON u.hospital_id = h.id 
      ORDER BY u.role, u.name
    `) as any

    // Get all hospitals
    const [hospitals] = await database.execute('SELECT * FROM hospitals ORDER BY name') as any

    // Group users by role
    const usersByRole = allUsers.reduce((acc: any, user: any) => {
      if (!acc[user.role]) acc[user.role] = []
      acc[user.role].push(user)
      return acc
    }, {})

    const testScenarios = [
      {
        title: 'Patient Registration and Login',
        description: 'Test the complete patient onboarding flow',
        steps: [
          'Visit /patient/register',
          'Fill in patient details (use any mobile/email not in system)',
          'Generate OTP (will be displayed in console)',
          'Complete registration with biometric placeholders',
          'Login using mobile/email and OTP',
          'View patient dashboard with medical timeline'
        ]
      },
      {
        title: 'Doctor Emergency Access',
        description: 'Test emergency access to patient records',
        steps: [
          'Login as doctor using demo credentials',
          'Visit /doctor/emergency',
          'Enter patient mobile number (use demo patient)',
          'Provide emergency reason',
          'Use OTP or biometric authentication',
          'Access patient medical timeline for 10 minutes',
          'View comprehensive patient data'
        ]
      },
      {
        title: 'Hospital Operator Workflow',
        description: 'Test hospital operator document and encounter management',
        steps: [
          'Login as operator using demo credentials',
          'Create new encounter for existing patient',
          'Upload medical documents (PDF/images)',
          'View hospital-specific patient data',
          'Manage encounters within hospital boundaries'
        ]
      },
      {
        title: 'Audit Transparency',
        description: 'Test comprehensive audit logging system',
        steps: [
          'Login as patient',
          'View audit logs in dashboard',
          'Check emergency access history',
          'Export audit logs as CSV',
          'Verify all actions are logged with timestamps'
        ]
      },
      {
        title: 'Multi-Hospital Scenario',
        description: 'Test hospital boundary enforcement',
        steps: [
          'Login as operator from Hospital A',
          'Try to access patient data from Hospital B',
          'Verify access is restricted to own hospital',
          'Upload documents only for own hospital patients',
          'Test cross-hospital emergency access by doctors'
        ]
      }
    ]

    return {
      users: {
        patients: usersByRole.PATIENT || [],
        doctors: usersByRole.DOCTOR || [],
        operators: usersByRole.OPERATOR || []
      },
      hospitals,
      features: {
        otpDisplay: process.env.NODE_ENV === 'development',
        biometricPlaceholders: true,
        emergencyAccess: true,
        auditLogging: true,
        developmentMode: process.env.NODE_ENV === 'development'
      },
      testScenarios
    }

  } catch (error) {
    console.error('Error getting dev setup info:', error)
    throw error
  }
}

/**
 * Display development setup information in console
 */
export async function displayDevSetup(): Promise<void> {
  try {
    const info = await getDevSetupInfo()

    console.log('\n🚀 E-PATIENT CONNECT - DEVELOPMENT SETUP')
    console.log('=' .repeat(50))

    console.log('\n👤 DEMO PATIENTS:')
    info.users.patients.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name}`)
      console.log(`      Mobile: ${user.mobile}`)
      console.log(`      Email: ${user.email}`)
    })

    console.log('\n👨‍⚕️ DEMO DOCTORS:')
    info.users.doctors.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name}`)
      console.log(`      Mobile: ${user.mobile}`)
      console.log(`      Email: ${user.email}`)
    })

    console.log('\n👨‍💼 DEMO OPERATORS:')
    info.users.operators.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name}`)
      console.log(`      Mobile: ${user.mobile}`)
      console.log(`      Email: ${user.email}`)
      console.log(`      Hospital: ${user.hospital_name}`)
    })

    console.log('\n🏥 HOSPITALS:')
    info.hospitals.forEach((hospital, index) => {
      console.log(`   ${index + 1}. ${hospital.name}`)
    })

    console.log('\n🔧 DEVELOPMENT FEATURES:')
    console.log(`   • OTP Display: ${info.features.otpDisplay ? '✅ Enabled' : '❌ Disabled'}`)
    console.log(`   • Biometric Placeholders: ${info.features.biometricPlaceholders ? '✅ Enabled' : '❌ Disabled'}`)
    console.log(`   • Emergency Access: ${info.features.emergencyAccess ? '✅ Enabled' : '❌ Disabled'}`)
    console.log(`   • Audit Logging: ${info.features.auditLogging ? '✅ Enabled' : '❌ Disabled'}`)
    console.log(`   • Development Mode: ${info.features.developmentMode ? '✅ Enabled' : '❌ Disabled'}`)

    console.log('\n🧪 TEST SCENARIOS:')
    info.testScenarios.forEach((scenario, index) => {
      console.log(`\n   ${index + 1}. ${scenario.title}`)
      console.log(`      ${scenario.description}`)
      console.log('      Steps:')
      scenario.steps.forEach((step, stepIndex) => {
        console.log(`        ${stepIndex + 1}. ${step}`)
      })
    })

    console.log('\n💡 QUICK START:')
    console.log('   1. Run: npm run db:init (if not done)')
    console.log('   2. Run: npm run db:seed')
    console.log('   3. Run: npm run dev')
    console.log('   4. Visit: http://localhost:3000')
    console.log('   5. Use demo credentials above for testing')

    console.log('\n🔍 API TESTING:')
    console.log('   • Health Check: GET /api/health')
    console.log('   • API Status: GET /api/status')
    console.log('   • API Documentation: /API_DOCUMENTATION.md')
    console.log('   • Test Script: node test-api.js')

  } catch (error) {
    console.error('Error displaying dev setup:', error)
  }
}

/**
 * Get demo credentials for frontend display
 */
export async function getDemoCredentials(): Promise<{
  patients: Array<{ name: string; mobile: string; email: string }>
  doctors: Array<{ name: string; mobile: string; email: string }>
  operators: Array<{ name: string; mobile: string; email: string; hospital: string }>
}> {
  try {
    const info = await getDevSetupInfo()
    
    return {
      patients: info.users.patients.map(user => ({
        name: user.name,
        mobile: user.mobile,
        email: user.email
      })),
      doctors: info.users.doctors.map(user => ({
        name: user.name,
        mobile: user.mobile,
        email: user.email
      })),
      operators: info.users.operators.map(user => ({
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        hospital: user.hospital_name || 'Unknown'
      }))
    }
  } catch (error) {
    console.error('Error getting demo credentials:', error)
    return { patients: [], doctors: [], operators: [] }
  }
}