import { NextRequest, NextResponse } from 'next/server'
import { smsService } from '@/lib/services/sms-service'

export async function GET(request: NextRequest) {
  try {
    const status = smsService.getStatus()
    
    return NextResponse.json({
      smsService: status,
      environment: process.env.NODE_ENV,
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      phoneNumberConfigured: !!process.env.TWILIO_PHONE_NUMBER,
      smsEnabled: process.env.SMS_ENABLED === 'true'
    })

  } catch (error) {
    console.error('SMS status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}