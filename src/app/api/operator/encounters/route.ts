import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { database } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['OPERATOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    
    const patientIdentifier = searchParams.get('patientIdentifier')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get operator's hospital
    const [operators] = await database.execute(
      'SELECT hospital_id FROM operator_profiles WHERE user_id = ?',
      [user.userId]
    ) as any

    if (!operators || operators.length === 0) {
      return NextResponse.json(
        { error: 'Operator profile not found' },
        { status: 404 }
      )
    }

    const operatorHospitalId = operators[0].hospital_id

    let query = `
      SELECT 
        e.id, e.patient_user_id, e.occurred_at, e.type, e.reason_diagnosis,
        e.prescriptions_notes, e.created_at,
        p.name as patient_name, p.mobile as patient_mobile, p.email as patient_email,
        COUNT(d.id) as document_count
      FROM encounters e
      JOIN users p ON e.patient_user_id = p.id
      LEFT JOIN documents d ON e.id = d.encounter_id
      WHERE e.hospital_id = ?
    `

    const queryParams: any[] = [operatorHospitalId]

    // Filter by patient if identifier provided
    if (patientIdentifier) {
      query += ' AND (p.mobile = ? OR p.email = ? OR p.id = ?)'
      queryParams.push(patientIdentifier, patientIdentifier, patientIdentifier)
    }

    query += ' GROUP BY e.id ORDER BY e.occurred_at DESC LIMIT ?'
    queryParams.push(limit)

    const [encounters] = await database.execute(query, queryParams) as any

    const formattedEncounters = encounters.map((encounter: any) => ({
      id: encounter.id,
      patientUserId: encounter.patient_user_id,
      patientName: encounter.patient_name,
      patientMobile: encounter.patient_mobile,
      patientEmail: encounter.patient_email,
      occurredAt: encounter.occurred_at,
      type: encounter.type,
      reasonDiagnosis: encounter.reason_diagnosis,
      prescriptionsNotes: encounter.prescriptions_notes,
      documentCount: encounter.document_count,
      createdAt: encounter.created_at
    }))

    return NextResponse.json({
      message: 'Encounters retrieved successfully',
      encounters: formattedEncounters
    })

  } catch (error) {
    console.error('Get operator encounters API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['OPERATOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const body = await request.json()

    const {
      patientIdentifier,
      occurredAt,
      type,
      reasonDiagnosis,
      prescriptionsNotes,
      allergiesSnapshot,
      chronicSnapshot,
      bloodGroup,
      recentSurgery
    } = body

    // Validate required fields
    if (!patientIdentifier || !occurredAt || !type || !reasonDiagnosis || !prescriptionsNotes) {
      return NextResponse.json(
        { error: 'Required fields: patientIdentifier, occurredAt, type, reasonDiagnosis, prescriptionsNotes' },
        { status: 400 }
      )
    }

    // Get operator's hospital
    const [operators] = await database.execute(
      'SELECT hospital_id FROM operator_profiles WHERE user_id = ?',
      [user.userId]
    ) as any

    if (!operators || operators.length === 0) {
      return NextResponse.json(
        { error: 'Operator profile not found' },
        { status: 404 }
      )
    }

    const operatorHospitalId = operators[0].hospital_id

    // Find patient
    const [patients] = await database.execute(
      'SELECT id FROM users WHERE (mobile = ? OR email = ? OR id = ?) AND role = ?',
      [patientIdentifier, patientIdentifier, patientIdentifier, 'PATIENT']
    ) as any

    if (!patients || patients.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    const patientUserId = patients[0].id

    // Create encounter
    const [encounterResult] = await database.execute(`
      INSERT INTO encounters (
        patient_user_id, occurred_at, type, reason_diagnosis, prescriptions_notes,
        allergies_snapshot, chronic_snapshot, blood_group, recent_surgery,
        created_by_role, created_by_user_id, hospital_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patientUserId,
      new Date(occurredAt),
      type,
      reasonDiagnosis,
      prescriptionsNotes,
      allergiesSnapshot || null,
      chronicSnapshot || null,
      bloodGroup || null,
      recentSurgery || null,
      'OPERATOR',
      user.userId,
      operatorHospitalId
    ]) as any

    const encounterId = encounterResult.insertId

    // Log encounter creation
    await database.execute(
      'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
      [
        user.userId,
        'OPERATOR',
        patientUserId,
        'ENCOUNTER_CREATED',
        JSON.stringify({
          encounterId: encounterId.toString(),
          type,
          occurredAt,
          createdBy: 'OPERATOR',
          hospitalId: operatorHospitalId,
          timestamp: new Date().toISOString()
        })
      ]
    )

    return NextResponse.json({
      message: 'Encounter created successfully',
      encounterId: encounterId.toString(),
      patientUserId
    })

  } catch (error) {
    console.error('Create operator encounter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}