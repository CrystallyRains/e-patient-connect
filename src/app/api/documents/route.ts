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

    // Get query parameters
    const patientId = searchParams.get('patientId')
    const encounterId = searchParams.get('encounterId')
    const hospitalId = searchParams.get('hospitalId')
    const mimetype = searchParams.get('mimetype')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

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
      // Patients can only see their own documents
      targetPatientId = user.userId
    } else if (user.role === 'OPERATOR') {
      // Operators can see documents from their hospital
      // targetPatientId will be undefined, but hospitalId filter will be applied
    } else if (user.role === 'DOCTOR' && 'sessionId' in user) {
      // Doctors with emergency session can see patient documents
      targetPatientId = user.patientUserId
    }

    // Build filters
    const filters: any = {}
    if (targetPatientId) filters.patientUserId = targetPatientId
    if (encounterId) filters.encounterId = encounterId
    if (hospitalId) filters.hospitalId = hospitalId
    if (mimetype) filters.mimetype = mimetype
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (limit) filters.limit = parseInt(limit)
    if (offset) filters.offset = parseInt(offset)

    // For operators, filter by their hospital if no specific hospital requested
    if (user.role === 'OPERATOR' && !hospitalId) {
      // Get operator's hospital
      const [operators] = await database.execute(
        'SELECT hospital_id FROM operator_profiles WHERE user_id = ?',
        [user.userId]
      ) as any

      if (operators && operators.length > 0) {
        filters.hospitalId = operators[0].hospital_id
      }
    }

    // Get documents
    const documentsResult = await DocumentService.getDocuments(filters)

    if (!documentsResult.success) {
      return NextResponse.json(
        { error: documentsResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: documentsResult.message,
      documents: documentsResult.documents
    })

  } catch (error) {
    console.error('Get documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}