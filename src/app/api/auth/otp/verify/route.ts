import { NextRequest, NextResponse } from 'next/server'
import { OTPService, SessionService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, otp, purpose = 'LOGIN' } = body

    // Validate input
    if (!identifier || !otp) {
      return NextResponse.json(
        { error: 'Mobile number/email and OTP are required' },
        { status: 400 }
      )
    }

    // Verify OTP
    const otpResult = await OTPService.verifyOTP(identifier, otp, purpose)

    if (!otpResult.success) {
      return NextResponse.json(
        { error: otpResult.message },
        { status: 400 }
      )
    }

    // Create session
    const sessionResult = await SessionService.createSession(otpResult.userId!)

    if (!sessionResult.success) {
      return NextResponse.json(
        { error: sessionResult.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Authentication successful',
      token: sessionResult.token,
      user: sessionResult.sessionData
    })

  } catch (error) {
    console.error('OTP verification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}