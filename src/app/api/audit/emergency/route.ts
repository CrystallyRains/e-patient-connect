import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, canAccessPatientData } from '@/lib/auth'
import { AuditService } from '@/lib/services/audit-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT', 'DOCTOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    let targetPatientId: string | undefined
    let targetDoctorId: string | undefined

    if (user.role === 'PATIENT') {
      // Patients can see emergency access to their own data
      targetPatientId = user.userId
    } else if (user.role === 'DOCTOR') {
      if (patientId) {
        // Check if doctor can access this patient's data (emergency session)
        if (!canAccessPatientData(user, patientId)) {
          return NextResponse.json(
            { error: 'Access denied for this patient data' },
            { status: 403 }
          )
        }
        targetPatientId = patientId
      } else {
        // Doctor wants to see their own emergency access history
        targetDoctorId = user.userId
      }
    }

    // Get emergency access audit trail
    const auditResult = await AuditService.getEmergencyAccessAudit(targetPatientId, targetDoctorId)

    if (!auditResult.success) {
      return NextResponse.json(
        { error: auditResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: auditResult.message,
      logs: auditResult.logs
    })

  } catch (error) {
    console.error('Get emergency audit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}