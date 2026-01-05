import jwt from 'jsonwebtoken'
import { database } from '../database'

export interface SessionData {
  userId: string
  role: string
  name: string
  mobile: string
  email: string
}

export interface EmergencySessionData extends SessionData {
  sessionId: string
  patientUserId: string
  reason: string
  expiresAt: Date
}

export interface SessionResult {
  success: boolean
  message: string
  token?: string
  sessionData?: SessionData | EmergencySessionData
}

export class SessionService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
  private static readonly REGULAR_SESSION_HOURS = 24
  private static readonly EMERGENCY_SESSION_MINUTES = 10

  /**
   * Create a regular user session
   */
  static async createSession(userId: string): Promise<SessionResult> {
    try {
      // Get user details
      const [users] = await database.execute(
        'SELECT id, role, name, mobile, email FROM users WHERE id = ?',
        [userId]
      ) as any

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      const user = users[0]

      const sessionData: SessionData = {
        userId: user.id,
        role: user.role,
        name: user.name,
        mobile: user.mobile,
        email: user.email
      }

      // Create JWT token
      const token = jwt.sign(
        {
          ...sessionData,
          type: 'regular',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (this.REGULAR_SESSION_HOURS * 60 * 60)
        },
        this.JWT_SECRET
      )

      // Log session creation
      await this.logAuditEvent(userId, 'SESSION_CREATED', {
        sessionType: 'regular',
        expiresIn: `${this.REGULAR_SESSION_HOURS} hours`
      })

      return {
        success: true,
        message: 'Session created successfully',
        token,
        sessionData
      }

    } catch (error) {
      console.error('Session creation error:', error)
      return {
        success: false,
        message: 'Failed to create session'
      }
    }
  }

  /**
   * Create an emergency access session for doctors
   */
  static async createEmergencySession(
    doctorUserId: string,
    patientUserId: string,
    method: 'OTP' | 'FINGERPRINT' | 'IRIS',
    reason: string,
    hospitalName?: string
  ): Promise<SessionResult> {
    try {
      // Get doctor details
      const [doctors] = await database.execute(
        'SELECT id, role, name, mobile, email FROM users WHERE id = ? AND role = ?',
        [doctorUserId, 'DOCTOR']
      ) as any

      if (!doctors || doctors.length === 0) {
        return {
          success: false,
          message: 'Doctor not found'
        }
      }

      // Get patient details
      const [patients] = await database.execute(
        'SELECT id, name FROM users WHERE id = ? AND role = ?',
        [patientUserId, 'PATIENT']
      ) as any

      if (!patients || patients.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        }
      }

      const doctor = doctors[0]
      const patient = patients[0]

      // Calculate expiry time
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + this.EMERGENCY_SESSION_MINUTES)

      // Create emergency session record
      const [sessionResult] = await database.execute(
        'INSERT INTO emergency_sessions (doctor_user_id, patient_user_id, method, reason, hospital_name, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [doctorUserId, patientUserId, method, reason, hospitalName, expiresAt]
      ) as any

      const sessionId = sessionResult.insertId

      const emergencySessionData: EmergencySessionData = {
        userId: doctor.id,
        role: doctor.role,
        name: doctor.name,
        mobile: doctor.mobile,
        email: doctor.email,
        sessionId: sessionId.toString(),
        patientUserId,
        reason,
        expiresAt
      }

      // Create JWT token for emergency session
      const token = jwt.sign(
        {
          ...emergencySessionData,
          type: 'emergency',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(expiresAt.getTime() / 1000)
        },
        this.JWT_SECRET
      )

      // Log emergency session creation
      await this.logAuditEvent(doctorUserId, 'EMERGENCY_SESSION_CREATED', {
        sessionId: sessionId.toString(),
        patientUserId,
        patientName: patient.name,
        reason,
        method,
        hospitalName,
        expiresAt: expiresAt.toISOString()
      }, patientUserId)

      console.log(`🚨 Emergency session created: Doctor ${doctor.name} accessing ${patient.name} for ${reason}`)

      return {
        success: true,
        message: 'Emergency session created successfully',
        token,
        sessionData: emergencySessionData
      }

    } catch (error) {
      console.error('Emergency session creation error:', error)
      return {
        success: false,
        message: 'Failed to create emergency session'
      }
    }
  }

  /**
   * Verify and decode a session token
   */
  static async verifySession(token: string): Promise<SessionResult> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any

      // Check if emergency session is still active
      if (decoded.type === 'emergency') {
        const [sessions] = await database.execute(
          'SELECT status, expires_at FROM emergency_sessions WHERE id = ?',
          [decoded.sessionId]
        ) as any

        if (!sessions || sessions.length === 0) {
          return {
            success: false,
            message: 'Emergency session not found'
          }
        }

        const session = sessions[0]

        if (session.status !== 'ACTIVE' || new Date() > new Date(session.expires_at)) {
          // Mark session as expired
          await database.execute(
            'UPDATE emergency_sessions SET status = ? WHERE id = ?',
            ['EXPIRED', decoded.sessionId]
          )

          return {
            success: false,
            message: 'Emergency session has expired'
          }
        }
      }

      return {
        success: true,
        message: 'Session is valid',
        sessionData: decoded
      }

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          message: 'Session has expired'
        }
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          message: 'Invalid session token'
        }
      }

      console.error('Session verification error:', error)
      return {
        success: false,
        message: 'Failed to verify session'
      }
    }
  }

  /**
   * Revoke an emergency session
   */
  static async revokeEmergencySession(sessionId: string): Promise<boolean> {
    try {
      await database.execute(
        'UPDATE emergency_sessions SET status = ? WHERE id = ?',
        ['REVOKED', sessionId]
      )

      await this.logAuditEvent(null, 'EMERGENCY_SESSION_REVOKED', {
        sessionId
      })

      return true
    } catch (error) {
      console.error('Session revocation error:', error)
      return false
    }
  }

  /**
   * Clean up expired emergency sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      await database.execute(
        'UPDATE emergency_sessions SET status = ? WHERE expires_at < NOW() AND status = ?',
        ['EXPIRED', 'ACTIVE']
      )
    } catch (error) {
      console.error('Session cleanup error:', error)
    }
  }

  /**
   * Log audit events
   */
  private static async logAuditEvent(
    userId: string | null, 
    actionType: string, 
    details: any, 
    patientUserId?: string
  ): Promise<void> {
    try {
      await database.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [userId, userId ? 'DOCTOR' : 'SYSTEM', patientUserId || null, actionType, JSON.stringify(details)]
      )
    } catch (error) {
      console.error('Audit logging error:', error)
    }
  }
}