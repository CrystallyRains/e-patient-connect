import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { executeSQLiteQuery } from '../../../../../database/sqlite'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Upload API called')
    
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log('🎫 Token extracted:', token.substring(0, 50) + '...')
    
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      console.log('✅ Token decoded successfully:', decoded)
    } catch (error) {
      console.log('❌ Token verification failed:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    console.log('📋 Form data received successfully')
    
    const patient_user_id = formData.get('patient_user_id') as string
    const type = formData.get('type') as string
    const reason_diagnosis = formData.get('reason_diagnosis') as string
    const prescriptions_notes = formData.get('prescriptions_notes') as string || ''
    const allergies_snapshot = formData.get('allergies_snapshot') as string || ''
    const chronic_snapshot = formData.get('chronic_snapshot') as string || ''
    const blood_group = formData.get('blood_group') as string || ''
    const recent_surgery = formData.get('recent_surgery') as string || ''

    console.log('📝 Form fields:', { patient_user_id, type, reason_diagnosis })

    // Validate required fields
    if (!patient_user_id || !type || !reason_diagnosis) {
      return NextResponse.json({ 
        error: 'Missing required fields: patient_user_id, type, reason_diagnosis' 
      }, { status: 400 })
    }

    // Verify patient exists
    const patients = await executeSQLiteQuery(
      'SELECT id, name FROM users WHERE id = ? AND role = "PATIENT"',
      [patient_user_id]
    ) as any[]

    if (!patients || patients.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = patients[0]

    // Get operator info - handle special operator session token
    let operator
    if (decoded.userId === 'operator-session') {
      // This is an operator session token
      operator = {
        id: 'operator-session',
        name: 'Hospital Operator',
        operator_hospital_id: null
      }
    } else {
      // Regular operator user
      const operators = await executeSQLiteQuery(
        'SELECT u.id, u.name, u.hospital_id, op.hospital_id as operator_hospital_id FROM users u LEFT JOIN operator_profiles op ON u.id = op.user_id WHERE u.id = ?',
        [decoded.userId]
      ) as any[]

      if (!operators || operators.length === 0) {
        return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
      }
      operator = operators[0]
    }

    // Create encounter
    const encounterId = uuidv4()
    await executeSQLiteQuery(`
      INSERT INTO encounters (
        id, patient_user_id, occurred_at, type, reason_diagnosis, 
        prescriptions_notes, allergies_snapshot, chronic_snapshot, 
        blood_group, recent_surgery, created_by_role, created_by_user_id, 
        hospital_id, created_at
      ) VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, 'OPERATOR', ?, ?, datetime('now'))
    `, [
      encounterId, patient_user_id, type, reason_diagnosis,
      prescriptions_notes, allergies_snapshot, chronic_snapshot,
      blood_group, recent_surgery, decoded.userId, operator.operator_hospital_id
    ])

    // Process file uploads
    const files = formData.getAll('files') as File[]
    const uploadedFiles = []

    if (files.length > 0) {
      // Ensure upload directory exists
      const uploadDir = join(process.cwd(), 'uploads')
      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (error) {
        // Directory might already exist
      }

      for (const file of files) {
        if (file.size > 0) {
          // Generate unique filename
          const fileExtension = file.name.split('.').pop()
          const uniqueFilename = `${uuidv4()}.${fileExtension}`
          const filePath = join(uploadDir, uniqueFilename)

          // Save file
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          await writeFile(filePath, buffer)

          // Save document record
          const documentId = uuidv4()
          await executeSQLiteQuery(`
            INSERT INTO documents (
              id, encounter_id, patient_user_id, uploaded_by_user_id, 
              hospital_id, filename, storage_path, mimetype, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            documentId, encounterId, patient_user_id, decoded.userId,
            operator.operator_hospital_id, file.name, uniqueFilename, file.type
          ])

          uploadedFiles.push({
            id: documentId,
            filename: file.name,
            size: file.size,
            type: file.type
          })
        }
      }
    }

    // Log the action
    await executeSQLiteQuery(`
      INSERT INTO audit_logs (
        actor_user_id, actor_role, patient_user_id, action_type, details_json, created_at
      ) VALUES (?, 'OPERATOR', ?, 'DOCUMENT_UPLOAD', ?, datetime('now'))
    `, [
      decoded.userId,
      patient_user_id,
      JSON.stringify({
        encounter_id: encounterId,
        document_type: type,
        files_count: uploadedFiles.length,
        operator_name: operator.name,
        patient_name: patient.name
      })
    ])

    return NextResponse.json({
      success: true,
      encounter_id: encounterId,
      files_uploaded: uploadedFiles.length,
      files: uploadedFiles
    })

  } catch (error) {
    console.error('Operator upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}