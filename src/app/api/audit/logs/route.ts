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

    // Get query parameters
    const patientId = searchParams.get('patientId')
    const actorRole = searchParams.get('actorRole')
    const actionType = searchParams.get('actionType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const search = searchParams.get('search')

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
      // Patients can only see their own audit logs
      targetPatientId = user.userId
    } else if (user.role === 'DOCTOR' && 'sessionId' in user) {
      // Doctors with emergency session can see patient audit logs
      targetPatientId = user.patientUserId
    }
    // Operators and doctors without emergency sessions cannot access audit logs

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
    if (actionType) filters.actionType = actionType
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (limit) filters.limit = parseInt(limit)
    if (offset) filters.offset = parseInt(offset)

    // Get audit logs
    let logsResult
    if (search) {
      logsResult = await AuditService.searchAuditLogs(search, filters)
    } else {
      logsResult = await AuditService.getAuditLogs(filters)
    }

    if (!logsResult.success) {
      return NextResponse.json(
        { error: logsResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: logsResult.message,
      logs: logsResult.logs
    })

  } catch (error) {
    console.error('Get audit logs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}