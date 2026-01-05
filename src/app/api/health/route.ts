import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const dbHealthy = await testConnection()
    
    // Check environment variables
    const envCheck = {
      jwtSecret: !!process.env.JWT_SECRET,
      dbConfig: !!(process.env.DB_HOST && process.env.DB_NAME),
      uploadDir: !!process.env.UPLOAD_DIR
    }

    const isHealthy = dbHealthy && Object.values(envCheck).every(Boolean)

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        environment: envCheck
      }
    }, {
      status: isHealthy ? 200 : 503
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, {
      status: 503
    })
  }
}
  