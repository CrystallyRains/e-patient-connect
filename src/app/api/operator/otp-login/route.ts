import { NextRequest, NextResponse } from 'next/server'
import { executeSQLiteQuery } from '../../../../../database/sqlite'
import { OTPService } from '@/lib/auth/otp-service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { patientIdentifier, otp } = await request.json()

    if (!patientIdentifier || !otp) {
      return NextResponse.json({ 
        error: 'Patient identifier and OTP are required' 
      }, { status: 400 })
    }

    // Find patient by mobile or email
    const patients = await executeSQLiteQuery(`
      SELECT u.id, u.name, u.mobile, u.email, u.role 
      FROM users u 
      WHERE (u.mobile = ? OR u.email = ?) AND u.role = 'PATIENT'
    `, [patientIdentifier, patientIdentifier]) as any[]

    if (!patients || patients.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found' 
      }, { status: 404 })
    }

    const patient = patients[0]

    // Verify OTP for the patient using the patient identifier
    const isValidOTP = await OTPService.verifyOTP(patientIdentifier, otp, 'OPERATOR_LOGIN')
    
    if (!isValidOTP.success) {
      return NextResponse.json({ 
        error: isValidOTP.message || 'Invalid or expired OTP' 
      }, { status: 401 })
    }

    // Create operator token for document upload
    const operatorToken = jwt.sign(
      { 
        userId: 'operator-session', // Special operator session
        patientId: patient.id,
        role: 'OPERATOR',
        purpose: 'DOCUMENT_UPLOAD'
      },
      JWT_SECRET,
      { expiresIn: '8h' } // 8 hour session for document upload
    )

    // Log the operator login
    await executeSQLiteQuery(`
      INSERT INTO audit_logs (
        actor_user_id, actor_role, patient_user_id, action_type, details_json, created_at
      ) VALUES (?, 'OPERATOR', ?, 'OPERATOR_LOGIN', ?, datetime('now'))
    `, [
      null, // No specific operator user ID in this simplified implementation
      patient.id,
      JSON.stringify({
        method: 'OTP',
        patient_identifier: patientIdentifier,
        login_time: new Date().toISOString()
      })
    ])

    return NextResponse.json({
      success: true,
      operatorToken,
      patientInfo: {
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile,
        email: patient.email
      }
    })

  } catch (error) {
    console.error('Operator OTP login error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}