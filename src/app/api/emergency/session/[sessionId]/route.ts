import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import jwt from 'jsonwebtoken'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Verify session exists and is active
    const [sessions] = await database.execute(`
      SELECT es.*, 
             d.name as doctorName, d.mobile as doctorMobile,
             p.name as patientName, p.mobile as patientMobile
      FROM emergency_sessions es
      JOIN users d ON es.doctor_user_id = d.id
      JOIN users p ON es.patient_user_id = p.id
      WHERE es.id = ? AND es.status = 'ACTIVE' AND es.expires_at > datetime('now')
    `, [sessionId]) as any

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }

    const session = sessions[0]

    // Verify token matches session
    if (decoded.sessionId !== sessionId || decoded.doctorId !== session.doctor_user_id) {
      return NextResponse.json(
        { error: 'Token does not match session' },
        { status: 403 }
      )
    }

    // Get patient details
    const [patients] = await database.execute(`
      SELECT u.*, pp.profile_photo_path, pp.emergency_contact, pp.id_proof_type, pp.id_proof_number
      FROM users u
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      WHERE u.id = ?
    `, [session.patient_user_id]) as any

    const patient = patients[0]

    // Get patient encounters
    const [encounters] = await database.execute(`
      SELECT * FROM encounters 
      WHERE patient_user_id = ? 
      ORDER BY occurred_at DESC
      LIMIT 20
    `, [session.patient_user_id]) as any

    // Get patient documents
    const [documents] = await database.execute(`
      SELECT d.*, e.type as encounterType, e.occurred_at as encounterDate
      FROM documents d
      LEFT JOIN encounters e ON d.encounter_id = e.id
      WHERE d.patient_user_id = ?
      ORDER BY d.uploaded_at DESC
      LIMIT 20
    `, [session.patient_user_id]) as any

    // Log the access
    await database.execute(`
      INSERT INTO audit_logs (
        actor_user_id, actor_role, patient_user_id, action_type, details_json
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      session.doctor_user_id,
      'DOCTOR',
      session.patient_user_id,
      'EMERGENCY_SESSION_ACCESS',
      JSON.stringify({
        action: 'Doctor accessed patient records during emergency session',
        sessionId,
        doctorName: session.doctorName,
        accessTime: new Date().toISOString()
      })
    ])

    return NextResponse.json({
      session: {
        id: session.id,
        doctorName: session.doctorName,
        patientName: session.patientName,
        reason: session.reason,
        method: session.method,
        hospitalName: session.hospital_name,
        grantedAt: session.granted_at,
        expiresAt: session.expires_at,
        status: session.status
      },
      patient: {
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile,
        email: patient.email,
        profilePhotoPath: patient.profile_photo_path,
        emergencyContact: patient.emergency_contact,
        idProofType: patient.id_proof_type,
        idProofNumber: patient.id_proof_number,
        // Get latest medical info from most recent encounter
        bloodGroup: encounters[0]?.blood_group,
        allergies: encounters[0]?.allergies_snapshot,
        chronicConditions: encounters[0]?.chronic_snapshot
      },
      encounters: encounters.map((e: any) => ({
        id: e.id,
        occurredAt: e.occurred_at,
        type: e.type,
        reasonDiagnosis: e.reason_diagnosis,
        prescriptionsNotes: e.prescriptions_notes,
        allergiesSnapshot: e.allergies_snapshot,
        chronicSnapshot: e.chronic_snapshot,
        bloodGroup: e.blood_group,
        recentSurgery: e.recent_surgery
      })),
      documents: documents.map((d: any) => ({
        id: d.id,
        filename: d.filename,
        mimetype: d.mimetype,
        uploadedAt: d.uploaded_at,
        encounterType: d.encounterType,
        encounterDate: d.encounterDate
      }))
    })

  } catch (error) {
    console.error('Emergency session API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}