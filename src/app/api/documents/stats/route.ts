import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, canAccessPatientData } from '@/lib/auth'
import { DocumentService } from '@/lib/services/document-service'
import { database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    let targetPatientId: string | undefined
    let targetHospitalId: string | undefined

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
    } else if (user.role === 'OPERATOR') {
      // Operators can see stats for their hospital
      const [operators] = await database.execute(
        'SELECT hospital_id FROM operator_profiles WHERE user_id = ?',
        [user.userId]
      ) as any

      if (operators && operators.length > 0) {
        targetHospitalId = operators[0].hospital_id
      }
    } else if (user.role === 'DOCTOR' && 'sessionId' in user) {
      // Doctors with emergency session can see patient stats
      targetPatientId = user.patientUserId
    }

    // Get document statistics
    const statsResult = await DocumentService.getDocumentStats(targetPatientId, targetHospitalId)

    if (!statsResult.success) {
      return NextResponse.json(
        { error: statsResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: statsResult.message,
      stats: statsResult.document
    })

  } catch (error) {
    console.error('Document stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}