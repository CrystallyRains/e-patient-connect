import { NextRequest, NextResponse } from 'next/server'
import { getDemoCredentials } from '@/lib/utils/dev-setup'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Demo credentials only available in development mode' },
        { status: 403 }
      )
    }

    const credentials = await getDemoCredentials()

    return NextResponse.json(credentials)

  } catch (error) {
    console.error('Demo credentials API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch demo credentials' },
      { status: 500 }
    )
  }
}