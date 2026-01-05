import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import jwt from 'jsonwebtoken'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')

    // Get patient encounters
    let query = `
      SELECT e.*, 
             COUNT(d.id) as documentCount
      FROM encounters e
      LEFT JOIN documents d ON e.id = d.encounter_id
      WHERE e.patient_user_id = ?
      GROUP BY e.id
      ORDER BY e.occurred_at DESC
    `
    
    const params = [decoded.userId]
    
    if (limit) {
      query += ' LIMIT ?'
      params.push(parseInt(limit))
    }

    const [encounters] = await database.execute(query, params) as any

    return NextResponse.json({
      encounters: encounters.map((e: any) => ({
        id: e.id,
        occurredAt: e.occurred_at,
        type: e.type,
        reasonDiagnosis: e.reason_diagnosis,
        prescriptionsNotes: e.prescriptions_notes,
        allergiesSnapshot: e.allergies_snapshot,
        chronicSnapshot: e.chronic_snapshot,
        bloodGroup: e.blood_group,
        recentSurgery: e.recent_surgery,
        documentCount: e.documentCount || 0
      }))
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

    const formData = await request.formData()
    
    const occurredAt = formData.get('occurredAt') as string
    const type = formData.get('type') as string
    const reasonDiagnosis = formData.get('reasonDiagnosis') as string
    const prescriptionsNotes = formData.get('prescriptionsNotes') as string
    const allergies = formData.get('allergies') as string
    const chronicConditions = formData.get('chronicConditions') as string
    const bloodGroup = formData.get('bloodGroup') as string
    const recentSurgery = formData.get('recentSurgery') as string

    // Validate required fields
    if (!occurredAt || !type || !reasonDiagnosis || !prescriptionsNotes) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    console.log('Creating encounter for user:', decoded.userId)
    console.log('Encounter data:', { occurredAt, type, reasonDiagnosis, prescriptionsNotes })

    // Create encounter
    let encounterResult
    try {
      [encounterResult] = await database.execute(`
        INSERT INTO encounters (
          patient_user_id, occurred_at, type, reason_diagnosis, prescriptions_notes,
          allergies_snapshot, chronic_snapshot, blood_group, recent_surgery,
          created_by_role, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        decoded.userId,
        occurredAt,
        type,
        reasonDiagnosis,
        prescriptionsNotes,
        allergies || null,
        chronicConditions || null,
        bloodGroup || null,
        recentSurgery || null,
        'PATIENT',
        decoded.userId
      ]) as any
    } catch (dbError) {
      console.error('Database error creating encounter:', dbError)
      return NextResponse.json(
        { error: 'Failed to create encounter in database' },
        { status: 500 }
      )
    }

    // For SQLite, the insertId might be in a different property
    const encounterId = encounterResult.insertId || encounterResult.lastID || encounterResult.id
    console.log('Encounter created with ID:', encounterId, 'Result:', encounterResult)

    if (!encounterId) {
      console.error('No encounter ID returned from database')
      return NextResponse.json(
        { error: 'Failed to get encounter ID from database' },
        { status: 500 }
      )
    }

    // Handle document uploads
    const documentKeys = Array.from(formData.keys()).filter(key => key.startsWith('document_'))
    
    for (const key of documentKeys) {
      const file = formData.get(key) as File
      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          // Generate unique filename
          const fileExtension = file.name.split('.').pop()
          const fileName = `${uuidv4()}.${fileExtension}`
          const filePath = join(process.cwd(), 'uploads', 'documents', fileName)
          
          await writeFile(filePath, buffer)
          
          // Save document record
          await database.execute(`
            INSERT INTO documents (
              encounter_id, patient_user_id, uploaded_by_user_id,
              filename, storage_path, mimetype, hospital_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            encounterId,
            decoded.userId,
            decoded.userId,
            file.name,
            `/uploads/documents/${fileName}`,
            file.type,
            null // Allow null hospital_id for patient uploads
          ])
          
          console.log('Document uploaded successfully:', file.name)
        } catch (docError) {
          console.error('Document upload error:', docError)
          // Continue with other documents even if one fails
        }
      }
    }

    // Log encounter creation
    try {
      await database.execute(`
        INSERT INTO audit_logs (
          actor_user_id, actor_role, patient_user_id, action_type, details_json
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        decoded.userId,
        'PATIENT',
        decoded.userId,
        'ENCOUNTER_CREATE',
        JSON.stringify({
          action: 'Patient created new medical encounter',
          encounterId,
          type,
          occurredAt,
          timestamp: new Date().toISOString()
        })
      ])
      console.log('Audit log created successfully')
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError)
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      message: 'Medical encounter added successfully',
      encounterId
    })

  } catch (error) {
    console.error('Add encounter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const encounterId = searchParams.get('id')

    if (!encounterId) {
      return NextResponse.json(
        { error: 'Encounter ID is required' },
        { status: 400 }
      )
    }

    // Verify encounter belongs to the user
    const [encounters] = await database.execute(`
      SELECT * FROM encounters 
      WHERE id = ? AND patient_user_id = ?
    `, [encounterId, decoded.userId]) as any

    if (!encounters || encounters.length === 0) {
      return NextResponse.json(
        { error: 'Encounter not found' },
        { status: 404 }
      )
    }

    const encounter = encounters[0]

    // Get associated documents for cleanup
    const [documents] = await database.execute(`
      SELECT * FROM documents WHERE encounter_id = ?
    `, [encounterId]) as any

    // Delete associated documents from storage and database
    for (const document of documents) {
      try {
        const filePath = join(process.cwd(), document.storage_path.replace('/uploads/', 'uploads/'))
        const fs = require('fs').promises
        await fs.unlink(filePath)
      } catch (fileError) {
        console.error('File deletion error:', fileError)
        // Continue even if file deletion fails
      }
    }

    // Delete documents from database
    await database.execute(`
      DELETE FROM documents WHERE encounter_id = ?
    `, [encounterId])

    // Delete encounter from database
    await database.execute(`
      DELETE FROM encounters WHERE id = ? AND patient_user_id = ?
    `, [encounterId, decoded.userId])

    // Log encounter deletion
    try {
      await database.execute(`
        INSERT INTO audit_logs (
          actor_user_id, actor_role, patient_user_id, action_type, details_json
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        decoded.userId,
        'PATIENT',
        decoded.userId,
        'ENCOUNTER_DELETE',
        JSON.stringify({
          action: 'Patient deleted medical encounter',
          encounterId,
          type: encounter.type,
          occurredAt: encounter.occurred_at,
          documentsDeleted: documents.length,
          timestamp: new Date().toISOString()
        })
      ])
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError)
    }

    return NextResponse.json({
      message: 'Encounter and associated documents deleted successfully'
    })

  } catch (error) {
    console.error('Delete encounter API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}