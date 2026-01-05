import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, canAccessPatientData } from '@/lib/auth'
import { EncounterService } from '@/lib/services/encounter-service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const patientId = searchParams.get('patientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Determine which patient's timeline to retrieve
    let targetPatientId: string

    if (patientId) {
      // Check if user can access this patient's data
      if (!canAccessPatientData(user, patientId)) {
        return NextResponse.json(
          { error: 'Access denied for this patient data' },
          { status: 403 }
        )
      }
      targetPatientId = patientId
    } else {
      // Default to user's own data (patients only)
      if (user.role !== 'PATIENT') {
        return NextResponse.json(
          { error: 'Patient ID is required for non-patient users' },
          { status: 400 }
        )
      }
      targetPatientId = user.userId
    }

    // Build filters
    const filters: any = {}
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (type) filters.type = type
    if (limit) filters.limit = parseInt(limit)
    if (offset) filters.offset = parseInt(offset)

    // Get patient timeline
    const timelineResult = await EncounterService.getPatientTimeline(targetPatientId, filters)

    if (!timelineResult.success) {
      return NextResponse.json(
        { error: timelineResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: timelineResult.message,
      encounters: timelineResult.encounters
    })

  } catch (error) {
    console.error('Get encounters API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT', 'OPERATOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const body = await request.json()

    const {
      patientUserId,
      occurredAt,
      type,
      reasonDiagnosis,
      prescriptionsNotes,
      allergiesSnapshot,
      chronicSnapshot,
      bloodGroup,
      recentSurgery,
      hospitalId
    } = body

    // Validate required fields
    if (!occurredAt || !type || !reasonDiagnosis || !prescriptionsNotes) {
      return NextResponse.json(
        { error: 'Required fields: occurredAt, type, reasonDiagnosis, prescriptionsNotes' },
        { status: 400 }
      )
    }

    // Determine target patient
    let targetPatientId: string

    if (user.role === 'PATIENT') {
      // Patients can only create encounters for themselves
      targetPatientId = user.userId
    } else if (user.role === 'OPERATOR') {
      // Operators must specify patient ID
      if (!patientUserId) {
        return NextResponse.json(
          { error: 'Patient ID is required for operators' },
          { status: 400 }
        )
      }
      targetPatientId = patientUserId
    } else {
      return NextResponse.json(
        { error: 'Invalid role for encounter creation' },
        { status: 403 }
      )
    }

    // Create encounter
    const encounterResult = await EncounterService.createEncounter(
      {
        patientUserId: targetPatientId,
        occurredAt: new Date(occurredAt),
        type,
        reasonDiagnosis,
        prescriptionsNotes,
        allergiesSnapshot,
        chronicSnapshot,
        bloodGroup,
        recentSurgery,
        hospitalId
      },
      user.userId,
      user.role
    )

    if (!encounterResult.success) {
      return NextResponse.json(
        { error: encounterResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: encounterResult.message,
      encounterId: encounterResult.encounterId
    })

  } catch (error) {
    console.error('Create encounter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}