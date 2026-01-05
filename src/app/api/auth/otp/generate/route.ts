import { NextRequest, NextResponse } from 'next/server'
import { OTPService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, purpose = 'LOGIN' } = body

    // Validate input
    if (!identifier) {
      return NextResponse.json(
        { error: 'Mobile number or email is required' },
        { status: 400 }
      )
    }

    // Generate OTP
    const result = await OTPService.generateOTP(identifier, purpose)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    // Return response (OTP included in development mode)
    return NextResponse.json({
      message: result.message,
      otp: result.otp, // Only present in development
      smsStatus: result.smsStatus,
      developmentMode: process.env.NODE_ENV === 'development',
      smsEnabled: process.env.SMS_ENABLED === 'true'
    })

  } catch (error) {
    console.error('OTP generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}