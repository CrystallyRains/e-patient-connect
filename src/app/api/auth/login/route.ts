import { NextRequest, NextResponse } from 'next/server'
import { OTPService, BiometricService, SessionService, BiometricType } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, method, otp, biometricType, biometricData } = body

    // Validate input
    if (!identifier || !method) {
      return NextResponse.json(
        { error: 'Identifier and authentication method are required' },
        { status: 400 }
      )
    }

    let userId: string | undefined

    // Handle different authentication methods
    switch (method) {
      case 'OTP':
        if (!otp) {
          return NextResponse.json(
            { error: 'OTP is required for OTP authentication' },
            { status: 400 }
          )
        }

        const otpResult = await OTPService.verifyOTP(identifier, otp, 'LOGIN')
        if (!otpResult.success) {
          return NextResponse.json(
            { error: otpResult.message },
            { status: 400 }
          )
        }
        userId = otpResult.userId
        break

      case 'BIOMETRIC':
        if (!biometricType) {
          return NextResponse.json(
            { error: 'Biometric type is required for biometric authentication' },
            { status: 400 }
          )
        }

        if (!['FINGERPRINT', 'IRIS'].includes(biometricType)) {
          return NextResponse.json(
            { error: 'Invalid biometric type. Must be FINGERPRINT or IRIS' },
            { status: 400 }
          )
        }

        const biometricResult = await BiometricService.verifyBiometric(
          identifier,
          biometricType as BiometricType,
          biometricData
        )

        if (!biometricResult.success) {
          return NextResponse.json(
            { error: biometricResult.message },
            { status: 400 }
          )
        }
        userId = biometricResult.userId
        break

      default:
        return NextResponse.json(
          { error: 'Invalid authentication method. Must be OTP or BIOMETRIC' },
          { status: 400 }
        )
    }

    // Create session
    const sessionResult = await SessionService.createSession(userId!)

    if (!sessionResult.success) {
      return NextResponse.json(
        { error: sessionResult.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Login successful',
      token: sessionResult.token,
      user: sessionResult.sessionData
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}