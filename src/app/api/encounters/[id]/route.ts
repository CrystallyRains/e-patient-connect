import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, canAccessPatientData } from '@/lib/auth'
import { EncounterService } from '@/lib/services/encounter-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const encounterId = params.id

    // Get encounter details
    const encounterResult = await EncounterService.getEncounter(encounterId)

    if (!encounterResult.success) {
      return NextResponse.json(
        { error: encounterResult.message },
        { status: 404 }
      )
    }

    const encounter = encounterResult.encounter!

    // Check if user can access this patient's data
    if (!canAccessPatientData(user, encounter.patientUserId)) {
      return NextResponse.json(
        { error: 'Access denied for this encounter' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      message: encounterResult.message,
      encounter
    })

  } catch (error) {
    console.error('Get encounter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request, ['PATIENT', 'OPERATOR'])

    if (!authResult.success) {
      return authResult.response!
    }

    const user = authResult.user!
    const encounterId = params.id
    const body = await request.json()

    const {
      occurredAt,
      type,
      reasonDiagnosis,
      prescriptionsNotes,
      allergiesSnapshot,
      chronicSnapshot,
      bloodGroup,
      recentSurgery
    } = body

    // Build update data
    const updateData: any = {}
    if (occurredAt) updateData.occurredAt = new Date(occurredAt)
    if (type) updateData.type = type
    if (reasonDiagnosis) updateData.reasonDiagnosis = reasonDiagnosis
    if (prescriptionsNotes) updateData.prescriptionsNotes = prescriptionsNotes
    if (allergiesSnapshot !== undefined) updateData.allergiesSnapshot = allergiesSnapshot
    if (chronicSnapshot !== undefined) updateData.chronicSnapshot = chronicSnapshot
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup
    if (recentSurgery !== undefined) updateData.recentSurgery = recentSurgery

    // Update encounter
    const updateResult = await EncounterService.updateEncounter(
      encounterId,
      updateData,
      user.userId,
      user.role
    )

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: updateResult.message
    })

  } catch (error) {
    console.error('Update encounter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}