import { NextRequest, NextResponse } from 'next/server'
import { executeSQLiteQuery } from '../../../../../database/sqlite'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { patientIdentifier, biometricType, biometricData } = await request.json()

    if (!patientIdentifier || !biometricType || !biometricData) {
      return NextResponse.json({ 
        error: 'Patient identifier, biometric type, and biometric data are required' 
      }, { status: 400 })
    }

    // Find patient by mobile or email
    const patients = await executeSQLiteQuery(`
      SELECT u.id, u.name, u.mobile, u.email, u.role,
             pp.biometric_fingerprint_ref, pp.biometric_iris_ref
      FROM users u 
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      WHERE (u.mobile = ? OR u.email = ?) AND u.role = 'PATIENT'
    `, [patientIdentifier, patientIdentifier]) as any[]

    if (!patients || patients.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found' 
      }, { status: 404 })
    }

    const patient = patients[0]

    // Verify biometric data (simplified for demo)
    let biometricValid = false
    if (biometricType === 'FINGERPRINT' && patient.biometric_fingerprint_ref) {
      // In a real implementation, you'd compare the biometric data with stored reference
      biometricValid = biometricData === 'placeholder_biometric_data'
    } else if (biometricType === 'IRIS' && patient.biometric_iris_ref) {
      // In a real implementation, you'd compare the biometric data with stored reference
      biometricValid = biometricData === 'placeholder_biometric_data'
    } else {
      // For demo purposes, allow biometric login even without stored biometric data
      biometricValid = biometricData === 'placeholder_biometric_data'
    }

    if (!biometricValid) {
      return NextResponse.json({ 
        error: 'Biometric authentication failed' 
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
        method: biometricType,
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
    console.error('Operator biometric login error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}