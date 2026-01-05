import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, SessionService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!

    // If this is an emergency session, revoke it
    if ('sessionId' in user) {
      await SessionService.revokeEmergencySession(user.sessionId)
    }

    // Log logout event
    // Note: In a real implementation, you might want to maintain a blacklist of tokens
    // For now, we'll just return success as JWT tokens are stateless

    return NextResponse.json({
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}