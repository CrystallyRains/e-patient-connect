import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { EmergencyService } from '@/lib/services/emergency-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get patient's emergency access history
    const historyResult = await EmergencyService.getPatientAccessHistory(user.userId, limit)

    if (!historyResult.success) {
      return NextResponse.json(
        { error: historyResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: historyResult.message,
      accessHistory: historyResult.patientInfo?.accessHistory || []
    })

  } catch (error) {
    console.error('Get emergency history API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}