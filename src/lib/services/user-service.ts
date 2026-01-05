import { database } from '../database'
import { BiometricService } from '../auth'

export interface CreatePatientData {
  name: string
  mobile: string
  email: string
  idProofType: string
  idProofNumber: string
  emergencyContact: string
  familyMemberId?: string
  profilePhotoPath?: string
}

export interface UpdatePatientData {
  name?: string
  mobile?: string
  email?: string
  emergencyContact?: string
  familyMemberId?: string
  profilePhotoPath?: string
}

export interface UserResult {
  success: boolean
  message: string
  userId?: string
  user?: any
}

export class UserService {
  /**
   * Create a new patient user with profile
   */
  static async createPatient(patientData: CreatePatientData): Promise<UserResult> {
    const connection = await database.getConnection()
    
    try {
      await connection.beginTransaction()

      // Check if mobile or email already exists
      const [existingUsers] = await connection.execute(
        'SELECT id, mobile, email FROM users WHERE mobile = ? OR email = ?',
        [patientData.mobile, patientData.email]
      ) as any

      if (existingUsers && existingUsers.length > 0) {
        const existing = existingUsers[0]
        const conflict = existing.mobile === patientData.mobile ? 'mobile number' : 'email'
        return {
          success: false,
          message: `A user with this ${conflict} already exists`
        }
      }

      // Check if ID proof number already exists
      const [existingProofs] = await connection.execute(
        'SELECT user_id FROM patient_profiles WHERE id_proof_number = ?',
        [patientData.idProofNumber]
      ) as any

      if (existingProofs && existingProofs.length > 0) {
        return {
          success: false,
          message: 'A user with this ID proof number already exists'
        }
      }

      // Create user
      const [userResult] = await connection.execute(
        'INSERT INTO users (role, name, mobile, email) VALUES (?, ?, ?, ?)',
        ['PATIENT', patientData.name, patientData.mobile, patientData.email]
      ) as any

      const userId = userResult.insertId

      // Create patient profile
      await connection.execute(
        'INSERT INTO patient_profiles (user_id, id_proof_type, id_proof_number, emergency_contact, family_member_id, profile_photo_path) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, patientData.idProofType, patientData.idProofNumber, patientData.emergencyContact, patientData.familyMemberId || null, patientData.profilePhotoPath || null]
      )

      // Log registration
      await connection.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [userId, 'PATIENT', userId, 'PATIENT_REGISTRATION', JSON.stringify({
          name: patientData.name,
          mobile: patientData.mobile,
          email: patientData.email,
          idProofType: patientData.idProofType,
          timestamp: new Date().toISOString()
        })]
      )

      await connection.commit()

      console.log(`✅ Patient registered: ${patientData.name} (${patientData.mobile})`)

      return {
        success: true,
        message: 'Patient registered successfully',
        userId: userId.toString()
      }

    } catch (error) {
      await connection.rollback()
      console.error('Patient registration error:', error)
      return {
        success: false,
        message: 'Failed to register patient. Please try again.'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Register biometric data for a patient
   */
  static async registerBiometrics(
    userId: string,
    fingerprintData?: string,
    irisData?: string
  ): Promise<UserResult> {
    try {
      // Verify user is a patient
      const [users] = await database.execute(
        'SELECT id, role FROM users WHERE id = ? AND role = ?',
        [userId, 'PATIENT']
      ) as any

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        }
      }

      let fingerprintRef = null
      let irisRef = null

      // Register fingerprint if provided
      if (fingerprintData) {
        const fingerprintResult = await BiometricService.registerBiometric(userId, 'FINGERPRINT', fingerprintData)
        if (!fingerprintResult.success) {
          return fingerprintResult
        }
      }

      // Register iris if provided
      if (irisData) {
        const irisResult = await BiometricService.registerBiometric(userId, 'IRIS', irisData)
        if (!irisResult.success) {
          return irisResult
        }
      }

      return {
        success: true,
        message: 'Biometric data registered successfully'
      }

    } catch (error) {
      console.error('Biometric registration error:', error)
      return {
        success: false,
        message: 'Failed to register biometric data'
      }
    }
  }

  /**
   * Get user profile with all related data
   */
  static async getUserProfile(userId: string): Promise<UserResult> {
    try {
      const [users] = await database.execute(`
        SELECT 
          u.id, u.role, u.name, u.mobile, u.email, u.hospital_id, u.created_at,
          pp.id_proof_type, pp.id_proof_number, pp.emergency_contact, pp.family_member_id,
          pp.biometric_fingerprint_ref, pp.biometric_iris_ref, pp.deleted_at, pp.profile_photo_path,
          dp.hospital_name as doctor_hospital,
          op.hospital_id as operator_hospital_id,
          h.name as hospital_name
        FROM users u
        LEFT JOIN patient_profiles pp ON u.id = pp.user_id
        LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
        LEFT JOIN operator_profiles op ON u.id = op.user_id
        LEFT JOIN hospitals h ON u.hospital_id = h.id
        WHERE u.id = ?
      `, [userId]) as any

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      const user = users[0]

      // Check if patient account is soft deleted
      if (user.role === 'PATIENT' && user.deleted_at) {
        return {
          success: false,
          message: 'User account has been deactivated'
        }
      }

      return {
        success: true,
        message: 'User profile retrieved successfully',
        user: {
          id: user.id,
          role: user.role,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          createdAt: user.created_at,
          profile: user.role === 'PATIENT' ? {
            idProofType: user.id_proof_type,
            idProofNumber: user.id_proof_number,
            emergencyContact: user.emergency_contact,
            familyMemberId: user.family_member_id,
            profilePhotoPath: user.profile_photo_path,
            hasBiometrics: {
              fingerprint: !!user.biometric_fingerprint_ref,
              iris: !!user.biometric_iris_ref
            }
          } : user.role === 'DOCTOR' ? {
            hospitalName: user.doctor_hospital
          } : user.role === 'OPERATOR' ? {
            hospitalId: user.operator_hospital_id,
            hospitalName: user.hospital_name
          } : null
        }
      }

    } catch (error) {
      console.error('Get user profile error:', error)
      return {
        success: false,
        message: 'Failed to retrieve user profile'
      }
    }
  }

  /**
   * Update patient profile
   */
  static async updatePatientProfile(userId: string, updateData: UpdatePatientData): Promise<UserResult> {
    const connection = await database.getConnection()

    try {
      await connection.beginTransaction()

      // Verify user is a patient
      const [users] = await connection.execute(
        'SELECT id, role FROM users WHERE id = ? AND role = ?',
        [userId, 'PATIENT']
      ) as any

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        }
      }

      // Check for conflicts if mobile or email is being updated
      if (updateData.mobile || updateData.email) {
        const [conflicts] = await connection.execute(
          'SELECT id FROM users WHERE (mobile = ? OR email = ?) AND id != ?',
          [updateData.mobile || '', updateData.email || '', userId]
        ) as any

        if (conflicts && conflicts.length > 0) {
          return {
            success: false,
            message: 'Mobile number or email already exists for another user'
          }
        }
      }

      // Update user table
      const userUpdates = []
      const userValues = []

      if (updateData.name) {
        userUpdates.push('name = ?')
        userValues.push(updateData.name)
      }
      if (updateData.mobile) {
        userUpdates.push('mobile = ?')
        userValues.push(updateData.mobile)
      }
      if (updateData.email) {
        userUpdates.push('email = ?')
        userValues.push(updateData.email)
      }

      if (userUpdates.length > 0) {
        userValues.push(userId)
        await connection.execute(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
          userValues
        )
      }

      // Update patient profile
      const profileUpdates = []
      const profileValues = []

      if (updateData.emergencyContact) {
        profileUpdates.push('emergency_contact = ?')
        profileValues.push(updateData.emergencyContact)
      }
      if (updateData.familyMemberId !== undefined) {
        profileUpdates.push('family_member_id = ?')
        profileValues.push(updateData.familyMemberId)
      }
      if (updateData.profilePhotoPath) {
        profileUpdates.push('profile_photo_path = ?')
        profileValues.push(updateData.profilePhotoPath)
      }

      if (profileUpdates.length > 0) {
        profileValues.push(userId)
        await connection.execute(
          `UPDATE patient_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`,
          profileValues
        )
      }

      // Log profile update
      await connection.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [userId, 'PATIENT', userId, 'PROFILE_UPDATE', JSON.stringify({
          updatedFields: Object.keys(updateData),
          timestamp: new Date().toISOString()
        })]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Profile updated successfully'
      }

    } catch (error) {
      await connection.rollback()
      console.error('Update patient profile error:', error)
      return {
        success: false,
        message: 'Failed to update profile'
      }
    } finally {
      connection.release()
    }
  }

  /**
   * Soft delete patient account
   */
  static async softDeletePatient(userId: string): Promise<UserResult> {
    try {
      // Verify user is a patient
      const [users] = await database.execute(
        'SELECT id, role, name FROM users WHERE id = ? AND role = ?',
        [userId, 'PATIENT']
      ) as any

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'Patient not found'
        }
      }

      const user = users[0]

      // Soft delete by setting deleted_at timestamp
      await database.execute(
        'UPDATE patient_profiles SET deleted_at = NOW() WHERE user_id = ?',
        [userId]
      )

      // Log soft deletion
      await database.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [userId, 'PATIENT', userId, 'ACCOUNT_SOFT_DELETE', JSON.stringify({
          patientName: user.name,
          timestamp: new Date().toISOString()
        })]
      )

      console.log(`🗑️ Patient account soft deleted: ${user.name} (${userId})`)

      return {
        success: true,
        message: 'Account deactivated successfully'
      }

    } catch (error) {
      console.error('Soft delete patient error:', error)
      return {
        success: false,
        message: 'Failed to deactivate account'
      }
    }
  }

  /**
   * Get user's audit logs
   */
  static async getUserAuditLogs(userId: string, limit: number = 50): Promise<UserResult> {
    try {
      const [logs] = await database.execute(`
        SELECT 
          al.id, al.actor_role, al.action_type, al.details_json, al.created_at,
          u.name as actor_name
        FROM audit_logs al
        LEFT JOIN users u ON al.actor_user_id = u.id
        WHERE al.patient_user_id = ? OR al.actor_user_id = ?
        ORDER BY al.created_at DESC
        LIMIT ?
      `, [userId, userId, limit]) as any

      const formattedLogs = logs.map((log: any) => ({
        id: log.id,
        actorRole: log.actor_role,
        actorName: log.actor_name || 'System',
        actionType: log.action_type,
        details: JSON.parse(log.details_json),
        timestamp: log.created_at
      }))

      return {
        success: true,
        message: 'Audit logs retrieved successfully',
        user: { auditLogs: formattedLogs }
      }

    } catch (error) {
      console.error('Get audit logs error:', error)
      return {
        success: false,
        message: 'Failed to retrieve audit logs'
      }
    }
  }
}