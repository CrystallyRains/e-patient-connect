import { database } from '../database'
import { SessionService, OTPService, BiometricService, BiometricType } from '../auth'

export interface EmergencyAccessRequest {
  doctorUserId: string
  patientIdentifier: string // mobile, email, or patient ID
  reason: string
  hospitalName?: string
  authMethod: 'OTP' | 'FINGERPRINT' | 'IRIS'
  authData?: string // OTP code or biometric data
}

export interface EmergencyAccessResult {
  success: boolean
  message: string
  sessionId?: string
  sessionToken?: string
  expiresAt?: Date
  patientInfo?: any
}

export interface EmergencySessionInfo {
  sessionId: string
  doctorUserId: string
  doctorName: string
  patientUserId: string
  patientName: string
  reason: string
  hospitalName?: string
  method: string
  grantedAt: Date
  expiresAt: Date
  status: string
  remainingTime?: number
}

export class EmergencyService {
  private static readonly SESSION_DURATION_MINUTES = 10

  /**
   * Request emergency access to patient records
   */
  static async requestEmergencyAccess(request: EmergencyAccessRequest): Promise<EmergencyAccessResult> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Verify doctor exists and is active
      const [doctors] = await connection.execute(
        'SELECT id, name, mobile, email FROM users WHERE id = ? AND role = ?',
        [request.doctorUserId, 'DOCTOR']
      ) as any

      if (!doctors || doctors.length === 0) {
        return {
          success: false,
          message: 'Doctor not found or invalid role'
        }
      }

      const doctor = doctors[0]

      // Find patient by identifier
      const [patients] = await connection.execute(
        'SELECT u.id, u.name, u.mobile, u.email, pp.deleted_at FROM users u LEFT JOIN patient_profiles pp ON u.id = pp.user_id WHERE (u.mobile = ? OR u.email = ? OR u.id = ?) AND u.role = ?',
        [request.patientIdentifier, request.patientIdentifier, request.patientIdentifier, 'PATIENT']
      ) as any

      if (!patients || patients.length === 0) {
        await this.logEmergencyAttempt(request.doctorUserId, null, request.reason, 'PATIENT_NOT_FOUND', request.authMethod)
        return {
          success: false,
          message: 'Patient not found with the provided identifier'
        }
      }

      const patient = patients[0]

      // Check if patient account is active
      if (patient.deleted_at) {
        await this.logEmergencyAttempt(request.doctorUserId, patient.id, request.reason, 'PATIENT_DEACTIVATED', request.authMethod)
        return {
          success: false,
          message: 'Cannot access records for deactivated patient account'
        }
      }

      // Validate authentication based on method
      let authValid = false
      let authMessage = ''

      switch (request.authMethod) {
        case 'OTP':
          if (!request.authData) {
            return {
              success: false,
              message: 'OTP is required for OTP authentication'
            }
          }

          const otpResult = await OTPService.verifyOTP(doctor.mobile, request.authData, 'EMERGENCY_ACCESS')
          authValid = otpResult.success
          authMessage = otpResult.message
          break

        case 'FINGERPRINT':
        case 'IRIS':
          const biometricResult = await BiometricService.verifyBiometric(
            doctor.mobile,
            request.authMethod as BiometricType,
            request.authData
          )
          authValid = biometricResult.success
          authMessage = biometricResult.message
          break

        default:
          return {
            success: false,
            message: 'Invalid authentication method'
          }
      }

      if (!authValid) {
        await this.logEmergencyAttempt(request.doctorUserId, patient.id, request.reason, 'AUTH_FAILED', request.authMethod)
        return {
          success: false,
          message: `Authentication failed: ${authMessage}`
        }
      }

      // Check for existing active sessions for this doctor-patient pair
      const [existingSessions] = await connection.execute(
        'SELECT id, expires_at FROM emergency_sessions WHERE doctor_user_id = ? AND patient_user_id = ? AND status = ? AND expires_at > NOW()',
        [request.doctorUserId, patient.id, 'ACTIVE']
      ) as any

      if (existingSessions && existingSessions.length > 0) {
        const existingSession = existingSessions[0]
        return {
          success: false,
          message: 'You already have an active emergency session for this patient',
          sessionId: existingSession.id.toString(),
          expiresAt: existingSession.expires_at
        }
      }

      // Create emergency session using SessionService
      const sessionResult = await SessionService.createEmergencySession(
        request.doctorUserId,
        patient.id,
        request.authMethod,
        request.reason,
        request.hospitalName
      )

      if (!sessionResult.success) {
        await this.logEmergencyAttempt(request.doctorUserId, patient.id, request.reason, 'SESSION_CREATION_FAILED', request.authMethod)
        return {
          success: false,
          message: sessionResult.message
        }
      }

      const emergencySessionData = sessionResult.sessionData as any

      // Log successful emergency access
      await this.logEmergencyAttempt(request.doctorUserId, patient.id, request.reason, 'ACCESS_GRANTED', request.authMethod, emergencySessionData.sessionId)

      await connection.commit()

      console.log(`🚨 Emergency access granted: Dr. ${doctor.name} accessing ${patient.name} for "${request.reason}"`)

      return {
        success: true,
        message: 'Emergency access granted successfully',
        sessionId: emergencySessionData.sessionId,
        sessionToken: sessionResult.token,
        expiresAt: emergencySessionData.expiresAt,
        patientInfo: {
          id: patient.id,
          name: patient.name,
          mobile: patient.mobile,
          email: patient.email
        }
      }

    } catch (error) {
      await connection.rollback()
      console.error('Emergency access request error:', error)
      return {
        success: false,
        message: 'Failed to process emergency access request'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Get emergency session information
   */
  static async getEmergencySession(sessionId: string): Promise<EmergencyAccessResult> {
    try {
      const [sessions] = await database.execute(`
        SELECT 
          es.id, es.doctor_user_id, es.patient_user_id, es.method, es.reason,
          es.hospital_name, es.granted_at, es.expires_at, es.status,
          d.name as doctor_name, d.mobile as doctor_mobile,
          p.name as patient_name, p.mobile as patient_mobile
        FROM emergency_sessions es
        JOIN users d ON es.doctor_user_id = d.id
        JOIN users p ON es.patient_user_id = p.id
        WHERE es.id = ?
      `, [sessionId]) as any

      if (!sessions || sessions.length === 0) {
        return {
          success: false,
          message: 'Emergency session not found'
        }
      }

      const session = sessions[0]
      const now = new Date()
      const expiresAt = new Date(session.expires_at)
      const remainingMs = expiresAt.getTime() - now.getTime()

      // Check if session has expired
      if (now > expiresAt || session.status !== 'ACTIVE') {
        // Mark as expired if not already
        if (session.status === 'ACTIVE') {
          await database.execute(
            'UPDATE emergency_sessions SET status = ? WHERE id = ?',
            ['EXPIRED', sessionId]
          )
        }

        return {
          success: false,
          message: 'Emergency session has expired'
        }
      }

      const sessionInfo: EmergencySessionInfo = {
        sessionId: session.id.toString(),
        doctorUserId: session.doctor_user_id,
        doctorName: session.doctor_name,
        patientUserId: session.patient_user_id,
        patientName: session.patient_name,
        reason: session.reason,
        hospitalName: session.hospital_name,
        method: session.method,
        grantedAt: session.granted_at,
        expiresAt: session.expires_at,
        status: session.status,
        remainingTime: Math.max(0, Math.ceil(remainingMs / 1000 / 60)) // minutes remaining
      }

      return {
        success: true,
        message: 'Emergency session retrieved successfully',
        patientInfo: sessionInfo
      }

    } catch (error) {
      console.error('Get emergency session error:', error)
      return {
        success: false,
        message: 'Failed to retrieve emergency session'
      }
    }
  }

  /**
   * Revoke emergency session
   */
  static async revokeEmergencySession(sessionId: string, revokedBy?: string): Promise<EmergencyAccessResult> {
    try {
      // Get session info before revoking
      const sessionResult = await this.getEmergencySession(sessionId)
      if (!sessionResult.success) {
        return sessionResult
      }

      // Revoke session
      const revoked = await SessionService.revokeEmergencySession(sessionId)
      if (!revoked) {
        return {
          success: false,
          message: 'Failed to revoke emergency session'
        }
      }

      // Log revocation
      await database.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, action_type, details_json) VALUES (?, ?, ?, ?)',
        [
          revokedBy || null,
          revokedBy ? 'SYSTEM' : 'MANUAL',
          'EMERGENCY_SESSION_REVOKED',
          JSON.stringify({
            sessionId,
            revokedBy: revokedBy || 'manual',
            timestamp: new Date().toISOString()
          })
        ]
      )

      return {
        success: true,
        message: 'Emergency session revoked successfully'
      }

    } catch (error) {
      console.error('Revoke emergency session error:', error)
      return {
        success: false,
        message: 'Failed to revoke emergency session'
      }
    }
  }

  /**
   * Get active emergency sessions for a doctor
   */
  static async getDoctorActiveSessions(doctorUserId: string): Promise<EmergencyAccessResult> {
    try {
      const [sessions] = await database.execute(`
        SELECT 
          es.id, es.patient_user_id, es.reason, es.hospital_name,
          es.granted_at, es.expires_at, es.method,
          p.name as patient_name, p.mobile as patient_mobile
        FROM emergency_sessions es
        JOIN users p ON es.patient_user_id = p.id
        WHERE es.doctor_user_id = ? AND es.status = ? AND es.expires_at > NOW()
        ORDER BY es.granted_at DESC
      `, [doctorUserId, 'ACTIVE']) as any

      const activeSessions = sessions.map((session: any) => {
        const now = new Date()
        const expiresAt = new Date(session.expires_at)
        const remainingMs = expiresAt.getTime() - now.getTime()

        return {
          sessionId: session.id.toString(),
          patientUserId: session.patient_user_id,
          patientName: session.patient_name,
          patientMobile: session.patient_mobile,
          reason: session.reason,
          hospitalName: session.hospital_name,
          method: session.method,
          grantedAt: session.granted_at,
          expiresAt: session.expires_at,
          remainingTime: Math.max(0, Math.ceil(remainingMs / 1000 / 60))
        }
      })

      return {
        success: true,
        message: 'Active sessions retrieved successfully',
        patientInfo: { activeSessions }
      }

    } catch (error) {
      console.error('Get doctor active sessions error:', error)
      return {
        success: false,
        message: 'Failed to retrieve active sessions'
      }
    }
  }

  /**
   * Get emergency access history for a patient
   */
  static async getPatientAccessHistory(patientUserId: string, limit: number = 50): Promise<EmergencyAccessResult> {
    try {
      const [history] = await database.execute(`
        SELECT 
          es.id, es.doctor_user_id, es.reason, es.hospital_name, es.method,
          es.granted_at, es.expires_at, es.status,
          d.name as doctor_name, d.mobile as doctor_mobile
        FROM emergency_sessions es
        JOIN users d ON es.doctor_user_id = d.id
        WHERE es.patient_user_id = ?
        ORDER BY es.granted_at DESC
        LIMIT ?
      `, [patientUserId, limit]) as any

      const accessHistory = history.map((session: any) => ({
        sessionId: session.id.toString(),
        doctorUserId: session.doctor_user_id,
        doctorName: session.doctor_name,
        doctorMobile: session.doctor_mobile,
        reason: session.reason,
        hospitalName: session.hospital_name,
        method: session.method,
        grantedAt: session.granted_at,
        expiresAt: session.expires_at,
        status: session.status,
        duration: this.calculateSessionDuration(session.granted_at, session.expires_at)
      }))

      return {
        success: true,
        message: 'Access history retrieved successfully',
        patientInfo: { accessHistory }
      }

    } catch (error) {
      console.error('Get patient access history error:', error)
      return {
        success: false,
        message: 'Failed to retrieve access history'
      }
    }
  }

  /**
   * Cleanup expired emergency sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const [result] = await database.execute(
        'UPDATE emergency_sessions SET status = ? WHERE expires_at < NOW() AND status = ?',
        ['EXPIRED', 'ACTIVE']
      ) as any

      if (result.affectedRows > 0) {
        console.log(`🧹 Cleaned up ${result.affectedRows} expired emergency sessions`)
      }
    } catch (error) {
      console.error('Cleanup expired sessions error:', error)
    }
  }

  /**
   * Log emergency access attempt
   */
  private static async logEmergencyAttempt(
    doctorUserId: string,
    patientUserId: string | null,
    reason: string,
    result: string,
    method: string,
    sessionId?: string
  ): Promise<void> {
    try {
      await database.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [
          doctorUserId,
          'DOCTOR',
          patientUserId,
          'EMERGENCY_ACCESS_ATTEMPT',
          JSON.stringify({
            reason,
            result,
            method,
            sessionId,
            timestamp: new Date().toISOString()
          })
        ]
      )
    } catch (error) {
      console.error('Emergency attempt logging error:', error)
    }
  }

  /**
   * Calculate session duration in minutes
   */
  private static calculateSessionDuration(grantedAt: Date, expiresAt: Date): number {
    const granted = new Date(grantedAt)
    const expires = new Date(expiresAt)
    return Math.ceil((expires.getTime() - granted.getTime()) / 1000 / 60)
  }

  /**
   * Validate emergency access request
   */
  static validateEmergencyRequest(request: Partial<EmergencyAccessRequest>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.doctorUserId) {
      errors.push('Doctor ID is required')
    }

    if (!request.patientIdentifier) {
      errors.push('Patient identifier is required')
    }

    if (!request.reason || request.reason.trim().length === 0) {
      errors.push('Reason for emergency access is required')
    } else if (request.reason.trim().length < 10) {
      errors.push('Reason must be at least 10 characters long')
    }

    if (!request.authMethod || !['OTP', 'FINGERPRINT', 'IRIS'].includes(request.authMethod)) {
      errors.push('Valid authentication method is required (OTP, FINGERPRINT, or IRIS)')
    }

    if (request.authMethod === 'OTP' && !request.authData) {
      errors.push('OTP code is required for OTP authentication')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}