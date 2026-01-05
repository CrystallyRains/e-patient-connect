import { NextRequest, NextResponse } from 'next/server'
import { SessionCleanup } from '@/lib/utils/session-cleanup'

export async function POST(request: NextRequest) {
  try {
    // Run manual cleanup
    await SessionCleanup.runCleanup()

    return NextResponse.json({
      message: 'Cleanup completed successfully'
    })

  } catch (error) {
    console.error('Manual cleanup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get cleanup status
    const status = SessionCleanup.getCleanupStatus()

    return NextResponse.json({
      message: 'Cleanup status retrieved successfully',
      status
    })

  } catch (error) {
    console.error('Get cleanup status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}