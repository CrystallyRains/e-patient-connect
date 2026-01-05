import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { UserService } from '@/lib/services/user-service'
import { BiometricService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const body = await request.json()
    const { fingerprintData, irisData } = body

    if (!fingerprintData && !irisData) {
      return NextResponse.json(
        { error: 'At least one biometric data (fingerprint or iris) is required' },
        { status: 400 }
      )
    }

    // Register biometrics
    const result = await UserService.registerBiometrics(
      user.userId,
      fingerprintData,
      irisData
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.message
    })

  } catch (error) {
    console.error('Biometric registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!

    // Get user's biometric status
    const biometrics = await BiometricService.getUserBiometrics(user.userId)

    return NextResponse.json({
      message: 'Biometric status retrieved successfully',
      biometrics
    })

  } catch (error) {
    console.error('Get biometrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}