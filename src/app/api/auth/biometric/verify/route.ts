import { NextRequest, NextResponse } from 'next/server'
import { BiometricService, BiometricType } from '@/lib/auth/biometric-service'
import { SessionService } from '@/lib/auth/session-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, biometricType, biometricData } = body

    // Validate input
    if (!identifier || !biometricType) {
      return NextResponse.json(
        { error: 'Mobile number/email and biometric type are required' },
        { status: 400 }
      )
    }

    // Validate biometric type
    if (!['FINGERPRINT', 'IRIS'].includes(biometricType)) {
      return NextResponse.json(
        { error: 'Invalid biometric type. Must be FINGERPRINT or IRIS' },
        { status: 400 }
      )
    }

    // Verify biometric
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

    // Create session
    const sessionResult = await SessionService.createSession(biometricResult.userId!)

    if (!sessionResult.success) {
      return NextResponse.json(
        { error: sessionResult.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Biometric authentication successful',
      token: sessionResult.token,
      user: sessionResult.sessionData
    })

  } catch (error) {
    console.error('Biometric verification API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}