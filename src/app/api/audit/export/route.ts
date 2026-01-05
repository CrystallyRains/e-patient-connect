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

    // Get audit logs for the user
    const [logs] = await database.execute(`
      SELECT 
        al.id,
        al.action_type,
        al.actor_role,
        al.details_json,
        al.created_at,
        u.name as actor_name,
        u.mobile as actor_mobile
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.patient_user_id = ?
      ORDER BY al.created_at DESC
    `, [decoded.userId]) as any

    // Convert to CSV format
    const csvHeaders = [
      'Date & Time',
      'Activity Type',
      'Actor Role',
      'Actor Name',
      'Actor Mobile',
      'Action Description',
      'Additional Details'
    ]

    const csvRows = logs.map((log: any) => {
      const details = log.details_json ? JSON.parse(log.details_json) : {}
      
      return [
        new Date(log.created_at).toLocaleString(),
        log.action_type.replace('_', ' '),
        log.actor_role,
        log.actor_name || 'System',
        log.actor_mobile || 'N/A',
        details.action || details.description || 'No description',
        JSON.stringify(details).replace(/"/g, '""') // Escape quotes for CSV
      ]
    })

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => `"${field}"`).join(',')
      )
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="access-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        'Content-Length': Buffer.byteLength(csvContent, 'utf8').toString(),
      },
    })

  } catch (error) {
    console.error('Audit export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}