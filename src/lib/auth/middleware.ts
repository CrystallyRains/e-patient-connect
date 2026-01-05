import { NextRequest, NextResponse } from 'next/server'
import { SessionService, SessionData, EmergencySessionData } from './session-service'

export interface AuthenticatedRequest extends NextRequest {
  user?: SessionData | EmergencySessionData
}

export type UserRole = 'PATIENT' | 'DOCTOR' | 'OPERATOR'

/**
 * Authentication middleware for API routes
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredRoles?: UserRole[]
): Promise<{ success: boolean; user?: SessionData | EmergencySessionData; response?: NextResponse }> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      }
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify session
    const sessionResult = await SessionService.verifySession(token)
    if (!sessionResult.success || !sessionResult.sessionData) {
      return {
        success: false,
        response: NextResponse.json(
          { error: sessionResult.message },
          { status: 401 }
        )
      }
    }

    const user = sessionResult.sessionData

    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role as UserRole)) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }
    }

    return {
      success: true,
      user
    }

  } catch (error) {
    console.error('Authentication middleware error:', error)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware for patient-only routes
 */
export async function authenticatePatient(request: NextRequest) {
  return authenticateRequest(request, ['PATIENT'])
}

/**
 * Middleware for doctor-only routes
 */
export async function authenticateDoctor(request: NextRequest) {
  return authenticateRequest(request, ['DOCTOR'])
}

/**
 * Middleware for operator-only routes
 */
export async function authenticateOperator(request: NextRequest) {
  return authenticateRequest(request, ['OPERATOR'])
}

/**
 * Middleware for emergency session routes (doctors accessing patient data)
 */
export async function authenticateEmergencySession(
  request: NextRequest,
  requiredPatientId?: string
): Promise<{ success: boolean; user?: EmergencySessionData; response?: NextResponse }> {
  const authResult = await authenticateRequest(request, ['DOCTOR'])
  
  if (!authResult.success) {
    return authResult as any
  }

  const user = authResult.user as EmergencySessionData

  // Check if this is an emergency session
  if (!user.sessionId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Emergency session required' },
        { status: 403 }
      )
    }
  }

  // Check if accessing the correct patient
  if (requiredPatientId && user.patientUserId !== requiredPatientId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Access denied for this patient' },
        { status: 403 }
      )
    }
  }

  return {
    success: true,
    user
  }
}

/**
 * Extract user from request (for use in API routes after authentication)
 */
export function getUserFromRequest(request: AuthenticatedRequest): SessionData | EmergencySessionData | null {
  return request.user || null
}

/**
 * Check if user has access to patient data
 */
export function canAccessPatientData(user: SessionData | EmergencySessionData, patientId: string): boolean {
  // Patient can access their own data
  if (user.role === 'PATIENT' && user.userId === patientId) {
    return true
  }

  // Doctor with emergency session can access specific patient data
  if (user.role === 'DOCTOR' && 'sessionId' in user && user.patientUserId === patientId) {
    return true
  }

  return false
}

/**
 * Validate emergency session access
 */
export function validateEmergencyAccess(user: SessionData | EmergencySessionData): boolean {
  if (user.role !== 'DOCTOR') {
    return false
  }

  // Check if this is an emergency session
  if (!('sessionId' in user)) {
    return false
  }

  // Check if session hasn't expired
  const emergencyUser = user as EmergencySessionData
  if (new Date() > emergencyUser.expiresAt) {
    return false
  }

  return true
}