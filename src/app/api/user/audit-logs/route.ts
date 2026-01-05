import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { UserService } from '@/lib/services/user-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get user's audit logs
    const logsResult = await UserService.getUserAuditLogs(user.userId, limit)

    if (!logsResult.success) {
      return NextResponse.json(
        { error: logsResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Audit logs retrieved successfully',
      logs: logsResult.user?.auditLogs || []
    })

  } catch (error) {
    console.error('Get audit logs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}