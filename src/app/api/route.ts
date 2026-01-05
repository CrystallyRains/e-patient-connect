import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin

  const endpoints = {
    system: {
      health: `${baseUrl}/api/health`,
      cleanup: `${baseUrl}/api/admin/cleanup`
    },
    authentication: {
      generateOTP: `${baseUrl}/api/auth/otp/generate`,
      verifyOTP: `${baseUrl}/api/auth/otp/verify`,
      biometricVerify: `${baseUrl}/api/auth/biometric/verify`,
      login: `${baseUrl}/api/auth/login`,
      register: `${baseUrl}/api/auth/register`,
      logout: `${baseUrl}/api/auth/logout`,
      validateSession: `${baseUrl}/api/auth/session/validate`
    },
    userManagement: {
      profile: `${baseUrl}/api/user/profile`,
      biometrics: `${baseUrl}/api/user/biometrics`,
      auditLogs: `${baseUrl}/api/user/audit-logs`
    },
    encounters: {
      list: `${baseUrl}/api/encounters`,
      create: `${baseUrl}/api/encounters`,
      byId: `${baseUrl}/api/encounters/[id]`
    },
    patient: {
      criticalInfo: `${baseUrl}/api/patient/critical-info`,
      stats: `${baseUrl}/api/patient/stats`,
      emergencyHistory: `${baseUrl}/api/patient/emergency-history`
    },
    emergency: {
      request: `${baseUrl}/api/emergency/request`,
      sessions: `${baseUrl}/api/emergency/sessions`,
      sessionAccess: `${baseUrl}/api/emergency/session/[sessionId]`
    },
    documents: {
      list: `${baseUrl}/api/documents`,
      upload: `${baseUrl}/api/documents/upload`,
      download: `${baseUrl}/api/documents/[id]`,
      stats: `${baseUrl}/api/documents/stats`
    },
    operator: {
      encounters: `${baseUrl}/api/operator/encounters`
    },
    audit: {
      logs: `${baseUrl}/api/audit/logs`,
      stats: `${baseUrl}/api/audit/stats`,
      emergency: `${baseUrl}/api/audit/emergency`,
      export: `${baseUrl}/api/audit/export`
    }
  }

  return NextResponse.json({
    message: 'E-Patient Connect API',
    version: '1.0.0',
    documentation: `${baseUrl}/API_DOCUMENTATION.md`,
    endpoints
  })}
