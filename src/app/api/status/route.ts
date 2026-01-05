import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const services = {
      authentication: {
        otp: 'active',
        biometric: 'active',
        sessions: 'active'
      },
      userManagement: {
        registration: 'active',
        profiles: 'active',
        biometrics: 'active'
      },
      medicalRecords: {
        encounters: 'active',
        timeline: 'active',
        criticalInfo: 'active'
      },
      emergency: {
        access: 'active',
        sessions: 'active',
        timeouts: 'active'
      },
      documents: {
        upload: 'active',
        download: 'active',
        validation: 'active'
      },
      audit: {
        logging: 'active',
        export: 'active',
        transparency: 'active'
      }
    }

    return NextResponse.json({
      message: 'E-Patient Connect API Status',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services,
      features: {
        passwordlessAuth: true,
        emergencyAccess: true,
        auditLogging: true,
        roleBasedAccess: true,
        hospitalBoundaries: true,
        timeBasedSessions: true
      }
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({
      error: 'Status check failed'
    }, {
      status: 500
    })
  }
}