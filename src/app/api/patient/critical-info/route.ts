import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, canAccessPatientData } from '@/lib/auth'
import { EncounterService } from '@/lib/services/encounter-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    // Determine which patient's critical info to retrieve
    let targetPatientId: string

    if (patientId) {
      // Check if user can access this patient's data
      if (!canAccessPatientData(user, patientId)) {
        return NextResponse.json(
          { error: 'Access denied for this patient data' },
          { status: 403 }
        )
      }
      targetPatientId = patientId
    } else {
      // Default to user's own data (patients only)
      if (user.role !== 'PATIENT') {
        return NextResponse.json(
          { error: 'Patient ID is required for non-patient users' },
          { status: 400 }
        )
      }
      targetPatientId = user.userId
    }

    // Get critical medical information
    const criticalInfoResult = await EncounterService.getCriticalMedicalInfo(targetPatientId)

    if (!criticalInfoResult.success) {
      return NextResponse.json(
        { error: criticalInfoResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: criticalInfoResult.message,
      criticalInfo: criticalInfoResult.encounter
    })

  } catch (error) {
    console.error('Get critical info API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}