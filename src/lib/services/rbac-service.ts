import { database } from '../database'
import { SessionData, EmergencySessionData } from '../auth'

export type Permission = 
  | 'READ_OWN_PROFILE'
  | 'UPDATE_OWN_PROFILE'
  | 'DELETE_OWN_PROFILE'
  | 'READ_OWN_ENCOUNTERS'
  | 'CREATE_ENCOUNTER'
  | 'READ_OWN_AUDIT_LOGS'
  | 'REQUEST_EMERGENCY_ACCESS'
  | 'VIEW_PATIENT_DATA'
  | 'UPLOAD_DOCUMENTS'
  | 'READ_HOSPITAL_ENCOUNTERS'

export interface RolePermissions {
  [role: string]: Permission[]
}

export const ROLE_PERMISSIONS: RolePermissions = {
  PATIENT: [
    'READ_OWN_PROFILE',
    'UPDATE_OWN_PROFILE',
    'DELETE_OWN_PROFILE',
    'READ_OWN_ENCOUNTERS',
    'CREATE_ENCOUNTER',
    'READ_OWN_AUDIT_LOGS'
  ],
  DOCTOR: [
    'READ_OWN_PROFILE',
    'REQUEST_EMERGENCY_ACCESS',
    'VIEW_PATIENT_DATA' // Only during emergency sessions
  ],
  OPERATOR: [
    'READ_OWN_PROFILE',
    'UPLOAD_DOCUMENTS',
    'READ_HOSPITAL_ENCOUNTERS'
  ]
}

export class RBACService {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(user: SessionData | EmergencySessionData, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[user.role] || []
    return rolePermissions.includes(permission)
  }

  /**
   * Check if user can access specific patient data
   */
  static canAccessPatientData(user: SessionData | EmergencySessionData, patientId: string): boolean {
    // Patient can access their own data
    if (user.role === 'PATIENT' && user.userId === patientId) {
      return true
    }

    // Doctor with active emergency session can access specific patient data
    if (user.role === 'DOCTOR' && 'sessionId' in user) {
      const emergencyUser = user as EmergencySessionData
      return emergencyUser.patientUserId === patientId && new Date() < emergencyUser.expiresAt
    }

    return false
  }

  /**
   * Check if operator can upload documents for a specific hospital
   */
  static async canOperatorUploadForHospital(userId: string, hospitalId: string): Promise<boolean> {
    try {
      const [operators] = await database.execute(
        'SELECT hospital_id FROM operator_profiles WHERE user_id = ?',
        [userId]
      ) as any

      if (!operators || operators.length === 0) {
        return false
      }

      return operators[0].hospital_id === hospitalId
    } catch (error) {
      console.error('Check operator hospital access error:', error)
      return false
    }
  }

  /**
   * Check if user can modify an encounter
   */
  static async canModifyEncounter(user: SessionData | EmergencySessionData, encounterId: string): Promise<boolean> {
    try {
      const [encounters] = await database.execute(
        'SELECT patient_user_id, created_by_user_id, created_by_role FROM encounters WHERE id = ?',
        [encounterId]
      ) as any

      if (!encounters || encounters.length === 0) {
        return false
      }

      const encounter = encounters[0]

      // Patient can modify their own encounters
      if (user.role === 'PATIENT' && user.userId === encounter.patient_user_id) {
        return true
      }

      // Creator can modify their own encounter (within reasonable time limits)
      if (user.userId === encounter.created_by_user_id) {
        return true
      }

      return false
    } catch (error) {
      console.error('Check encounter modification access error:', error)
      return false
    }
  }

  /**
   * Get user's effective permissions (including context-specific permissions)
   */
  static getEffectivePermissions(user: SessionData | EmergencySessionData): Permission[] {
    const basePermissions = ROLE_PERMISSIONS[user.role] || []

    // Add context-specific permissions
    if (user.role === 'DOCTOR' && 'sessionId' in user) {
      // Doctor with emergency session gets additional permissions
      return [...basePermissions, 'VIEW_PATIENT_DATA']
    }

    return basePermissions
  }

  /**
   * Validate resource access with detailed logging
   */
  static async validateResourceAccess(
    user: SessionData | EmergencySessionData,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<{ allowed: boolean; reason: string }> {
    try {
      switch (resourceType) {
        case 'patient_profile':
          if (user.role === 'PATIENT' && user.userId === resourceId) {
            return { allowed: true, reason: 'Own profile access' }
          }
          if (user.role === 'DOCTOR' && 'sessionId' in user) {
            const emergencyUser = user as EmergencySessionData
            if (emergencyUser.patientUserId === resourceId) {
              return { allowed: true, reason: 'Emergency session access' }
            }
          }
          return { allowed: false, reason: 'Insufficient permissions for patient profile' }

        case 'encounter':
          const canModify = await this.canModifyEncounter(user, resourceId)
          if (canModify) {
            return { allowed: true, reason: 'Encounter access granted' }
          }
          return { allowed: false, reason: 'No access to this encounter' }

        case 'hospital_data':
          if (user.role === 'OPERATOR') {
            const canAccess = await this.canOperatorUploadForHospital(user.userId, resourceId)
            if (canAccess) {
              return { allowed: true, reason: 'Hospital operator access' }
            }
          }
          return { allowed: false, reason: 'No access to hospital data' }

        default:
          return { allowed: false, reason: 'Unknown resource type' }
      }
    } catch (error) {
      console.error('Resource access validation error:', error)
      return { allowed: false, reason: 'Access validation failed' }
    }
  }

  /**
   * Log access attempt for audit purposes
   */
  static async logAccessAttempt(
    user: SessionData | EmergencySessionData,
    resourceType: string,
    resourceId: string,
    action: string,
    allowed: boolean,
    reason: string
  ): Promise<void> {
    try {
      await database.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, action_type, details_json) VALUES (?, ?, ?, ?)',
        [
          user.userId,
          user.role,
          'ACCESS_ATTEMPT',
          JSON.stringify({
            resourceType,
            resourceId,
            action,
            allowed,
            reason,
            timestamp: new Date().toISOString(),
            sessionType: 'sessionId' in user ? 'emergency' : 'regular'
          })
        ]
      )
    } catch (error) {
      console.error('Access attempt logging error:', error)
    }
  }
}