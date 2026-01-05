import { database } from '../database'

export interface AuditLogEntry {
  id?: string
  actorUserId?: string
  actorRole: string
  patientUserId?: string
  actionType: string
  details: any
  timestamp?: Date
  actorName?: string
  patientName?: string
}

export interface AuditLogFilters {
  patientUserId?: string
  actorUserId?: string
  actorRole?: string
  actionType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface AuditResult {
  success: boolean
  message: string
  logs?: AuditLogEntry[]
  stats?: any
}

export const AUDIT_ACTION_TYPES = {
  // Authentication Actions
  PATIENT_REGISTRATION: 'Patient Registration',
  LOGIN_SUCCESS: 'Login Success',
  LOGIN_FAILED: 'Login Failed',
  LOGOUT: 'Logout',
  OTP_GENERATED: 'OTP Generated',
  OTP_VERIFICATION_SUCCESS: 'OTP Verification Success',
  OTP_VERIFICATION_FAILED: 'OTP Verification Failed',
  BIOMETRIC_FINGERPRINT_LOGIN: 'Biometric Fingerprint Login',
  BIOMETRIC_IRIS_LOGIN: 'Biometric Iris Login',
  BIOMETRIC_REGISTRATION: 'Biometric Registration',

  // Profile Actions
  PROFILE_UPDATE: 'Profile Update',
  PROFILE_VIEW: 'Profile View',
  ACCOUNT_SOFT_DELETE: 'Account Soft Delete',

  // Encounter Actions
  ENCOUNTER_CREATED: 'Encounter Created',
  ENCOUNTER_UPDATED: 'Encounter Updated',
  ENCOUNTER_VIEWED: 'Encounter Viewed',

  // Document Actions
  DOCUMENT_UPLOADED: 'Document Uploaded',
  DOCUMENT_VIEWED: 'Document Viewed',
  DOCUMENT_DOWNLOADED: 'Document Downloaded',
  DOCUMENT_DELETED: 'Document Deleted',

  // Emergency Access Actions
  EMERGENCY_ACCESS_ATTEMPT: 'Emergency Access Attempt',
  EMERGENCY_SESSION_CREATED: 'Emergency Session Created',
  EMERGENCY_SESSION_REVOKED: 'Emergency Session Revoked',
  PATIENT_DATA_ACCESSED: 'Patient Data Accessed',

  // System Actions
  SESSION_CREATED: 'Session Created',
  SESSION_EXPIRED: 'Session Expired',
  ACCESS_ATTEMPT: 'Access Attempt',
  PERMISSION_DENIED: 'Permission Denied'
} as const

export type AuditActionType = keyof typeof AUDIT_ACTION_TYPES

export class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent(
    actorUserId: string | null,
    actorRole: string,
    actionType: string,
    details: any,
    patientUserId?: string
  ): Promise<boolean> {
    try {
      await database.execute(
        'INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json) VALUES (?, ?, ?, ?, ?)',
        [
          actorUserId,
          actorRole,
          patientUserId || null,
          actionType,
          JSON.stringify({
            ...details,
            timestamp: new Date().toISOString()
          })
        ]
      )

      return true
    } catch (error) {
      console.error('Audit logging error:', error)
      return false
    }
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditResult> {
    try {
      let query = `
        SELECT 
          al.id, al.actor_user_id, al.actor_role, al.patient_user_id,
          al.action_type, al.details_json, al.created_at,
          actor.name as actor_name,
          patient.name as patient_name
        FROM audit_logs al
        LEFT JOIN users actor ON al.actor_user_id = actor.id
        LEFT JOIN users patient ON al.patient_user_id = patient.id
        WHERE 1=1
      `

      const queryParams: any[] = []

      // Apply filters
      if (filters.patientUserId) {
        query += ' AND al.patient_user_id = ?'
        queryParams.push(filters.patientUserId)
      }

      if (filters.actorUserId) {
        query += ' AND al.actor_user_id = ?'
        queryParams.push(filters.actorUserId)
      }

      if (filters.actorRole) {
        query += ' AND al.actor_role = ?'
        queryParams.push(filters.actorRole)
      }

      if (filters.actionType) {
        query += ' AND al.action_type = ?'
        queryParams.push(filters.actionType)
      }

      if (filters.startDate) {
        query += ' AND al.created_at >= ?'
        queryParams.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND al.created_at <= ?'
        queryParams.push(filters.endDate)
      }

      query += ' ORDER BY al.created_at DESC'

      // Apply pagination
      if (filters.limit) {
        query += ' LIMIT ?'
        queryParams.push(filters.limit)

        if (filters.offset) {
          query += ' OFFSET ?'
          queryParams.push(filters.offset)
        }
      }

      const [logs] = await database.execute(query, queryParams) as any

      const formattedLogs: AuditLogEntry[] = logs.map((log: any) => ({
        id: log.id,
        actorUserId: log.actor_user_id,
        actorRole: log.actor_role,
        actorName: log.actor_name || 'System',
        patientUserId: log.patient_user_id,
        patientName: log.patient_name,
        actionType: log.action_type,
        details: JSON.parse(log.details_json),
        timestamp: log.created_at
      }))

      return {
        success: true,
        message: 'Audit logs retrieved successfully',
        logs: formattedLogs
      }

    } catch (error) {
      console.error('Get audit logs error:', error)
      return {
        success: false,
        message: 'Failed to retrieve audit logs'
      }
    }
  }

  /**
   * Get patient's audit logs (what happened to their data)
   */
  static async getPatientAuditLogs(patientUserId: string, limit: number = 100): Promise<AuditResult> {
    return this.getAuditLogs({
      patientUserId,
      limit
    })
  }

  /**
   * Get user's activity logs (what they did)
   */
  static async getUserActivityLogs(actorUserId: string, limit: number = 100): Promise<AuditResult> {
    return this.getAuditLogs({
      actorUserId,
      limit
    })
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(filters: Partial<AuditLogFilters> = {}): Promise<AuditResult> {
    try {
      let baseQuery = 'FROM audit_logs al WHERE 1=1'
      const queryParams: any[] = []

      // Apply filters to base query
      if (filters.patientUserId) {
        baseQuery += ' AND al.patient_user_id = ?'
        queryParams.push(filters.patientUserId)
      }

      if (filters.actorRole) {
        baseQuery += ' AND al.actor_role = ?'
        queryParams.push(filters.actorRole)
      }

      if (filters.startDate) {
        baseQuery += ' AND al.created_at >= ?'
        queryParams.push(filters.startDate)
      }

      if (filters.endDate) {
        baseQuery += ' AND al.created_at <= ?'
        queryParams.push(filters.endDate)
      }

      // Get overall statistics
      const [overallStats] = await database.execute(`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(DISTINCT al.actor_user_id) as unique_actors,
          COUNT(DISTINCT al.patient_user_id) as unique_patients,
          COUNT(DISTINCT al.action_type) as unique_actions,
          MIN(al.created_at) as earliest_log,
          MAX(al.created_at) as latest_log
        ${baseQuery}
      `, queryParams) as any

      // Get action type breakdown
      const [actionBreakdown] = await database.execute(`
        SELECT al.action_type, COUNT(*) as count
        ${baseQuery}
        GROUP BY al.action_type
        ORDER BY count DESC
        LIMIT 10
      `, queryParams) as any

      // Get role breakdown
      const [roleBreakdown] = await database.execute(`
        SELECT al.actor_role, COUNT(*) as count
        ${baseQuery}
        GROUP BY al.actor_role
        ORDER BY count DESC
      `, queryParams) as any

      // Get recent activity (last 24 hours)
      const [recentActivity] = await database.execute(`
        SELECT COUNT(*) as recent_count
        ${baseQuery}
        AND al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `, queryParams) as any

      const stats = {
        totalLogs: overallStats[0]?.total_logs || 0,
        uniqueActors: overallStats[0]?.unique_actors || 0,
        uniquePatients: overallStats[0]?.unique_patients || 0,
        uniqueActions: overallStats[0]?.unique_actions || 0,
        earliestLog: overallStats[0]?.earliest_log,
        latestLog: overallStats[0]?.latest_log,
        recentActivity: recentActivity[0]?.recent_count || 0,
        actionBreakdown: actionBreakdown.map((item: any) => ({
          actionType: item.action_type,
          count: item.count
        })),
        roleBreakdown: roleBreakdown.map((item: any) => ({
          role: item.actor_role,
          count: item.count
        }))
      }

      return {
        success: true,
        message: 'Audit statistics retrieved successfully',
        stats
      }

    } catch (error) {
      console.error('Get audit stats error:', error)
      return {
        success: false,
        message: 'Failed to retrieve audit statistics'
      }
    }
  }

  /**
   * Get emergency access audit trail
   */
  static async getEmergencyAccessAudit(patientUserId?: string, doctorUserId?: string): Promise<AuditResult> {
    const filters: AuditLogFilters = {
      limit: 100
    }

    if (patientUserId) {
      filters.patientUserId = patientUserId
    }

    if (doctorUserId) {
      filters.actorUserId = doctorUserId
    }

    try {
      let query = `
        SELECT 
          al.id, al.actor_user_id, al.actor_role, al.patient_user_id,
          al.action_type, al.details_json, al.created_at,
          doctor.name as doctor_name,
          patient.name as patient_name
        FROM audit_logs al
        LEFT JOIN users doctor ON al.actor_user_id = doctor.id
        LEFT JOIN users patient ON al.patient_user_id = patient.id
        WHERE al.action_type IN (?, ?, ?, ?)
      `

      const queryParams = [
        'EMERGENCY_ACCESS_ATTEMPT',
        'EMERGENCY_SESSION_CREATED',
        'EMERGENCY_SESSION_REVOKED',
        'PATIENT_DATA_ACCESSED'
      ]

      if (patientUserId) {
        query += ' AND al.patient_user_id = ?'
        queryParams.push(patientUserId)
      }

      if (doctorUserId) {
        query += ' AND al.actor_user_id = ?'
        queryParams.push(doctorUserId)
      }

      query += ' ORDER BY al.created_at DESC LIMIT 100'

      const [logs] = await database.execute(query, queryParams) as any

      const formattedLogs: AuditLogEntry[] = logs.map((log: any) => ({
        id: log.id,
        actorUserId: log.actor_user_id,
        actorRole: log.actor_role,
        actorName: log.doctor_name || 'Unknown Doctor',
        patientUserId: log.patient_user_id,
        patientName: log.patient_name || 'Unknown Patient',
        actionType: log.action_type,
        details: JSON.parse(log.details_json),
        timestamp: log.created_at
      }))

      return {
        success: true,
        message: 'Emergency access audit trail retrieved successfully',
        logs: formattedLogs
      }

    } catch (error) {
      console.error('Get emergency access audit error:', error)
      return {
        success: false,
        message: 'Failed to retrieve emergency access audit trail'
      }
    }
  }

  /**
   * Search audit logs by keyword
   */
  static async searchAuditLogs(
    searchTerm: string,
    filters: Partial<AuditLogFilters> = {}
  ): Promise<AuditResult> {
    try {
      let query = `
        SELECT 
          al.id, al.actor_user_id, al.actor_role, al.patient_user_id,
          al.action_type, al.details_json, al.created_at,
          actor.name as actor_name,
          patient.name as patient_name
        FROM audit_logs al
        LEFT JOIN users actor ON al.actor_user_id = actor.id
        LEFT JOIN users patient ON al.patient_user_id = patient.id
        WHERE (
          al.action_type LIKE ? OR
          al.details_json LIKE ? OR
          actor.name LIKE ? OR
          patient.name LIKE ?
        )
      `

      const searchPattern = `%${searchTerm}%`
      const queryParams = [searchPattern, searchPattern, searchPattern, searchPattern]

      // Apply additional filters
      if (filters.patientUserId) {
        query += ' AND al.patient_user_id = ?'
        queryParams.push(filters.patientUserId)
      }

      if (filters.actorRole) {
        query += ' AND al.actor_role = ?'
        queryParams.push(filters.actorRole)
      }

      if (filters.startDate) {
        query += ' AND al.created_at >= ?'
        queryParams.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND al.created_at <= ?'
        queryParams.push(filters.endDate)
      }

      query += ' ORDER BY al.created_at DESC'

      if (filters.limit) {
        query += ' LIMIT ?'
        queryParams.push(filters.limit)
      }

      const [logs] = await database.execute(query, queryParams) as any

      const formattedLogs: AuditLogEntry[] = logs.map((log: any) => ({
        id: log.id,
        actorUserId: log.actor_user_id,
        actorRole: log.actor_role,
        actorName: log.actor_name || 'System',
        patientUserId: log.patient_user_id,
        patientName: log.patient_name,
        actionType: log.action_type,
        details: JSON.parse(log.details_json),
        timestamp: log.created_at
      }))

      return {
        success: true,
        message: 'Audit log search completed successfully',
        logs: formattedLogs
      }

    } catch (error) {
      console.error('Search audit logs error:', error)
      return {
        success: false,
        message: 'Failed to search audit logs'
      }
    }
  }

  /**
   * Clean up old audit logs (optional - for data retention)
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<boolean> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const [result] = await database.execute(
        'DELETE FROM audit_logs WHERE created_at < ?',
        [cutoffDate]
      ) as any

      console.log(`🧹 Cleaned up ${result.affectedRows} old audit logs (older than ${retentionDays} days)`)
      return true

    } catch (error) {
      console.error('Audit log cleanup error:', error)
      return false
    }
  }

  /**
   * Export audit logs to CSV format
   */
  static async exportAuditLogs(filters: AuditLogFilters = {}): Promise<{ success: boolean; csv?: string; message: string }> {
    try {
      const logsResult = await this.getAuditLogs(filters)
      
      if (!logsResult.success || !logsResult.logs) {
        return {
          success: false,
          message: logsResult.message
        }
      }

      // Generate CSV headers
      const headers = [
        'ID',
        'Timestamp',
        'Actor Name',
        'Actor Role',
        'Patient Name',
        'Action Type',
        'Details'
      ]

      // Generate CSV rows
      const rows = logsResult.logs.map(log => [
        log.id || '',
        log.timestamp?.toISOString() || '',
        log.actorName || '',
        log.actorRole || '',
        log.patientName || '',
        log.actionType || '',
        JSON.stringify(log.details).replace(/"/g, '""') // Escape quotes for CSV
      ])

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return {
        success: true,
        csv: csvContent,
        message: 'Audit logs exported successfully'
      }

    } catch (error) {
      console.error('Export audit logs error:', error)
      return {
        success: false,
        message: 'Failed to export audit logs'
      }
    }
  }

  /**
   * Get action type display name
   */
  static getActionTypeDisplayName(actionType: string): string {
    return AUDIT_ACTION_TYPES[actionType as AuditActionType] || actionType
  }

  /**
   * Get action type icon
   */
  static getActionTypeIcon(actionType: string): string {
    const iconMap: Record<string, string> = {
      'PATIENT_REGISTRATION': '👤',
      'LOGIN_SUCCESS': '🔓',
      'LOGIN_FAILED': '🔒',
      'LOGOUT': '👋',
      'OTP_GENERATED': '📱',
      'OTP_VERIFICATION_SUCCESS': '✅',
      'OTP_VERIFICATION_FAILED': '❌',
      'BIOMETRIC_FINGERPRINT_LOGIN': '👆',
      'BIOMETRIC_IRIS_LOGIN': '👁️',
      'PROFILE_UPDATE': '✏️',
      'PROFILE_VIEW': '👀',
      'ACCOUNT_SOFT_DELETE': '🗑️',
      'ENCOUNTER_CREATED': '📋',
      'ENCOUNTER_UPDATED': '✏️',
      'ENCOUNTER_VIEWED': '👀',
      'DOCUMENT_UPLOADED': '📄',
      'DOCUMENT_VIEWED': '👀',
      'DOCUMENT_DOWNLOADED': '⬇️',
      'DOCUMENT_DELETED': '🗑️',
      'EMERGENCY_ACCESS_ATTEMPT': '🚨',
      'EMERGENCY_SESSION_CREATED': '🚨',
      'EMERGENCY_SESSION_REVOKED': '🛑',
      'PATIENT_DATA_ACCESSED': '👀',
      'SESSION_CREATED': '🔑',
      'SESSION_EXPIRED': '⏰',
      'ACCESS_ATTEMPT': '🔍',
      'PERMISSION_DENIED': '🚫'
    }

    return iconMap[actionType] || '📝'
  }
}