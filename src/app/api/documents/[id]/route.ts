import { NextRequest, NextResponse } from 'next/server'
import { executeSQLiteQuery } from '../../../../../database/sqlite'
import jwt from 'jsonwebtoken'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: documentId } = await params

    // Get document info from database
    let documents: any
    
    // Check if this is an emergency token
    if (decoded.type === 'emergency') {
      // For emergency access, allow doctors to access patient documents
      // Verify the emergency session is still active
      const sessions = await executeSQLiteQuery(`
        SELECT patient_user_id FROM emergency_sessions 
        WHERE id = ? AND doctor_user_id = ? AND status = 'ACTIVE' AND expires_at > datetime('now')
      `, [decoded.sessionId, decoded.doctorId]) as any[]

      if (!sessions || sessions.length === 0) {
        return NextResponse.json(
          { error: 'Emergency session expired or invalid' },
          { status: 403 }
        )
      }

      // Get document for the patient in the emergency session
      const docs = await executeSQLiteQuery(`
        SELECT d.*, e.type as encounter_type, e.occurred_at as encounter_date
        FROM documents d
        LEFT JOIN encounters e ON d.encounter_id = e.id
        WHERE d.id = ? AND d.patient_user_id = ?
      `, [documentId, sessions[0].patient_user_id]) as any[]

      documents = docs
    } else {
      // Regular patient access - allow patients to access their own documents
      const docs = await executeSQLiteQuery(`
        SELECT d.*, e.type as encounter_type, e.occurred_at as encounter_date
        FROM documents d
        LEFT JOIN encounters e ON d.encounter_id = e.id
        WHERE d.id = ? AND d.patient_user_id = ?
      `, [documentId, decoded.userId]) as any[]

      documents = docs
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const document = documents[0]

    // Read file from storage
    try {
      let filePath: string
      
      // Handle different storage path formats
      if (document.storage_path.startsWith('/uploads/')) {
        // Old format: /uploads/documents/filename.ext
        filePath = join(process.cwd(), document.storage_path.substring(1)) // Remove leading slash
      } else {
        // New format: filename.ext (stored directly in uploads/)
        filePath = join(process.cwd(), 'uploads', document.storage_path)
      }
      
      console.log('🔍 Attempting to read file:', filePath)
      const fileBuffer = await readFile(filePath)

      // Return file with appropriate headers for download
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': document.mimetype,
          'Content-Disposition': `attachment; filename="${document.filename}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    } catch (fileError) {
      console.error('File read error:', fileError)
      console.error('Document storage_path:', document.storage_path)
      
      // Try alternative path if first attempt fails
      try {
        let alternativePath: string
        if (document.storage_path.startsWith('/uploads/')) {
          // Try without the /uploads/ prefix
          const filename = document.storage_path.split('/').pop()
          alternativePath = join(process.cwd(), 'uploads', filename!)
        } else {
          // Try with /uploads/documents/ prefix
          alternativePath = join(process.cwd(), 'uploads', 'documents', document.storage_path)
        }
        
        console.log('🔄 Trying alternative path:', alternativePath)
        const fileBuffer = await readFile(alternativePath)
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': document.mimetype,
            'Content-Disposition': `attachment; filename="${document.filename}"`,
            'Content-Length': fileBuffer.length.toString(),
          },
        })
      } catch (alternativeError) {
        console.error('Alternative path also failed:', alternativeError)
        return NextResponse.json(
          { error: 'File not found on disk' },
          { status: 404 }
        )
      }
    }

  } catch (error) {
    console.error('Download document API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: documentId } = await params

    // Get document info from database - only allow patients to delete their own documents
    const documents = await executeSQLiteQuery(`
      SELECT * FROM documents 
      WHERE id = ? AND patient_user_id = ?
    `, [documentId, decoded.userId]) as any[]

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const document = documents[0]

    // Delete file from storage
    try {
      let filePath: string
      
      // Handle different storage path formats
      if (document.storage_path.startsWith('/uploads/')) {
        // Old format: /uploads/documents/filename.ext
        filePath = join(process.cwd(), document.storage_path.substring(1)) // Remove leading slash
      } else {
        // New format: filename.ext (stored directly in uploads/)
        filePath = join(process.cwd(), 'uploads', document.storage_path)
      }
      
      const fs = require('fs').promises
      await fs.unlink(filePath)
    } catch (fileError) {
      console.error('File deletion error (continuing with DB deletion):', fileError)
      
      // Try alternative path if first attempt fails
      try {
        let alternativePath: string
        if (document.storage_path.startsWith('/uploads/')) {
          // Try without the /uploads/ prefix
          const filename = document.storage_path.split('/').pop()
          alternativePath = join(process.cwd(), 'uploads', filename!)
        } else {
          // Try with /uploads/documents/ prefix
          alternativePath = join(process.cwd(), 'uploads', 'documents', document.storage_path)
        }
        
        const fs = require('fs').promises
        await fs.unlink(alternativePath)
      } catch (alternativeError) {
        console.error('Alternative path deletion also failed (continuing with DB deletion):', alternativeError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await executeSQLiteQuery(`
      DELETE FROM documents WHERE id = ? AND patient_user_id = ?
    `, [documentId, decoded.userId])

    // Log document deletion
    try {
      await executeSQLiteQuery(`
        INSERT INTO audit_logs (
          actor_user_id, actor_role, patient_user_id, action_type, details_json
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        decoded.userId,
        'PATIENT',
        decoded.userId,
        'DOCUMENT_DELETE',
        JSON.stringify({
          action: 'Patient deleted document',
          documentId,
          filename: document.filename,
          timestamp: new Date().toISOString()
        })
      ])
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError)
    }

    return NextResponse.json({
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Delete document API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}