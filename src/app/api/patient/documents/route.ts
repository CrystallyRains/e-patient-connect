import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import jwt from 'jsonwebtoken'

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

    // Get patient documents
    const [documents] = await database.execute(`
      SELECT d.*, e.type as encounterType, e.occurred_at as encounterDate
      FROM documents d
      LEFT JOIN encounters e ON d.encounter_id = e.id
      WHERE d.patient_user_id = ?
      ORDER BY d.uploaded_at DESC
    `, [decoded.userId]) as any

    return NextResponse.json({
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
    console.error('Patient documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}