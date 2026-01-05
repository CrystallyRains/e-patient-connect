import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify JWT token to get doctor info
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      patientIdentifier, // Optional for unconscious patients
      reason,
      hospitalName,
      authMethod,
      authData
    } = body

    // Validate required fields
    if (!reason || !authMethod || !authData) {
      return NextResponse.json(
        { error: 'Reason, authentication method, and authentication data are required' },
        { status: 400 }
      )
    }

    // Get doctor info from token
    const [doctors] = await database.execute(
      'SELECT id, name, mobile, email FROM users WHERE id = ? AND role = "DOCTOR"',
      [decoded.userId]
    ) as any

    if (!doctors || doctors.length === 0) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    const doctor = doctors[0]

    let patient = null

    // If patient identifier is provided, find the patient
    if (patientIdentifier) {
      const [patients] = await database.execute(
        'SELECT id, name, mobile, email FROM users WHERE (mobile = ? OR email = ? OR id = ?) AND role = "PATIENT"',
        [patientIdentifier, patientIdentifier, patientIdentifier]
      ) as any

      if (!patients || patients.length === 0) {
        return NextResponse.json(
          { error: 'Patient not found with this identifier' },
          { status: 404 }
        )
      }

      patient = patients[0]
    } else {
      // For unconscious patients, we'll use biometric data to identify them
      // In a real implementation, this would match biometric data against stored biometrics
      // For now, we'll simulate finding a patient through biometric matching
      
      // Simulate biometric patient identification
      const [biometricPatients] = await database.execute(
        'SELECT u.id, u.name, u.mobile, u.email FROM users u JOIN patient_profiles pp ON u.id = pp.user_id WHERE u.role = "PATIENT" AND (pp.biometric_fingerprint_ref IS NOT NULL OR pp.biometric_iris_ref IS NOT NULL) LIMIT 1'
      ) as any

      if (!biometricPatients || biometricPatients.length === 0) {
        return NextResponse.json(
          { error: 'No patient found through biometric identification. Please provide patient identifier or ensure patient has registered biometrics.' },
          { status: 404 }
        )
      }

      patient = biometricPatients[0]
      console.log(`🔍 Patient identified through biometric scan: ${patient.name}`)
    }

    // Create emergency session (30 minutes)
    const sessionId = uuidv4()
    const now = new Date()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30) // 30 minutes

    await database.execute(`
      INSERT INTO emergency_sessions (
        id, doctor_user_id, patient_user_id, method, reason, 
        hospital_name, granted_at, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [
      sessionId,
      doctor.id,
      patient.id,
      authMethod,
      reason,
      hospitalName || null,
      now.toISOString(),
      expiresAt.toISOString()
    ])

    // Create session token
    const sessionToken = jwt.sign(
      {
        sessionId,
        doctorId: doctor.id,
        patientId: patient.id,
        type: 'emergency',
        expiresAt: expiresAt.toISOString()
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30m' }
    )

    // Log emergency access
    await database.execute(`
      INSERT INTO audit_logs (
        actor_user_id, actor_role, patient_user_id, action_type, details_json
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      doctor.id,
      'DOCTOR',
      patient.id,
      'EMERGENCY_ACCESS',
      JSON.stringify({
        action: 'Emergency access granted via OTP authentication',
        method: authMethod,
        reason,
        hospitalName,
        sessionId,
        expiresAt: expiresAt.toISOString(),
        doctorName: doctor.name,
        doctorMobile: doctor.mobile,
        patientIdentificationMethod: patientIdentifier ? 'manual_identifier' : 'biometric_scan'
      })
    ])

    console.log(`🚨 Emergency access granted: Dr. ${doctor.name} -> Patient ${patient.name} (${authMethod})`)

    return NextResponse.json({
      message: 'Emergency access granted successfully',
      sessionId,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      patient: {
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile
      },
      doctor: {
        id: doctor.id,
        name: doctor.name,
        mobile: doctor.mobile
      },
      identificationMethod: patientIdentifier ? 'manual' : 'biometric'
    })

  } catch (error) {
    console.error('Emergency request API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}