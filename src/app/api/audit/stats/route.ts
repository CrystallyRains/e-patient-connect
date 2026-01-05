import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, canAccessPatientData } from '@/lib/auth'
import { AuditService } from '@/lib/services/audit-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)

    const patientId = searchParams.get('patientId')
    const actorRole = searchParams.get('actorRole')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Determine access permissions
    let targetPatientId: string | undefined

    if (patientId) {
      // Check if user can access this patient's data
      if (!canAccessPatientData(user, patientId)) {
        return NextResponse.json(
          { error: 'Access denied for this patient data' },
          { status: 403 }
        )
      }
      targetPatientId = patientId
    } else if (user.role === 'PATIENT') {
      // Patients can only see their own stats
      targetPatientId = user.userId
    } else if (user.role === 'DOCTOR' && 'sessionId' in user) {
      // Doctors with emergency session can see patient stats
      targetPatientId = user.patientUserId
    }

    if (!targetPatientId && user.role !== 'PATIENT') {
      return NextResponse.json(
        { error: 'Patient ID is required for non-patient users' },
        { status: 400 }
      )
    }

    // Build filters
    const filters: any = {}
    if (targetPatientId) filters.patientUserId = targetPatientId
    if (actorRole) filters.actorRole = actorRole
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)

    // Get audit statistics
    const statsResult = await AuditService.getAuditStats(filters)

    if (!statsResult.success) {
      return NextResponse.json(
        { error: statsResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: statsResult.message,
      stats: statsResult.stats
    })

  } catch (error) {
    console.error('Get audit stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}