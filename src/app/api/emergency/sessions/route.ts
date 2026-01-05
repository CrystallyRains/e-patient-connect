import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { EmergencyService } from '@/lib/services/emergency-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['DOCTOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!

    // Get doctor's active sessions
    const sessionsResult = await EmergencyService.getDoctorActiveSessions(user.userId)

    if (!sessionsResult.success) {
      return NextResponse.json(
        { error: sessionsResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: sessionsResult.message,
      activeSessions: sessionsResult.patientInfo?.activeSessions || []
    })

  } catch (error) {
    console.error('Get active sessions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}