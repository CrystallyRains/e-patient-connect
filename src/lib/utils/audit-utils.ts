import { AuditService } from '../services/audit-service'

/**
 * Audit logging and display utilities
 */

export interface AuditLogDisplay {
  id: string
  timestamp: string
  actor: string
  action: string
  details: string
  icon: string
  severity: 'low' | 'medium' | 'high'
  category: 'auth' | 'profile' | 'medical' | 'emergency' | 'system'
}

/**
 * Format audit log for display
 */
export function formatAuditLogForDisplay(log: any): AuditLogDisplay {
  const timestamp = new Date(log.timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  const actor = log.actorName || 'System'
  const action = AuditService.getActionTypeDisplayName(log.actionType)
  const icon = AuditService.getActionTypeIcon(log.actionType)
  const severity = getActionSeverity(log.actionType)
  const category = getActionCategory(log.actionType)
  
  let details = ''
  try {
    const detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details
    details = formatAuditDetails(log.actionType, detailsObj)
  } catch (error) {
    details = 'Details unavailable'
  }

  return {
    id: log.id,
    timestamp,
    actor,
    action,
    details,
    icon,
    severity,
    category
  }
}

/**
 * Get action severity level
 */
export function getActionSeverity(actionType: string): 'low' | 'medium' | 'high' {
  const highSeverityActions = [
    'LOGIN_FAILED',
    'EMERGENCY_ACCESS_ATTEMPT',
    'EMERGENCY_SESSION_CREATED',
    'ACCOUNT_SOFT_DELETE',
    'PERMISSION_DENIED',
    'DOCUMENT_DELETED'
  ]

  const mediumSeverityActions = [
    'LOGIN_SUCCESS',
    'PROFILE_UPDATE',
    'ENCOUNTER_CREATED',
    'ENCOUNTER_UPDATED',
    'DOCUMENT_UPLOADED',
    'PATIENT_DATA_ACCESSED',
    'EMERGENCY_SESSION_REVOKED'
  ]

  if (highSeverityActions.includes(actionType)) {
    return 'high'
  } else if (mediumSeverityActions.includes(actionType)) {
    return 'medium'
  } else {
    return 'low'
  }
}

/**
 * Get action category
 */
export function getActionCategory(actionType: string): 'auth' | 'profile' | 'medical' | 'emergency' | 'system' {
  const authActions = [
    'PATIENT_REGISTRATION',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'OTP_GENERATED',
    'OTP_VERIFICATION_SUCCESS',
    'OTP_VERIFICATION_FAILED',
    'BIOMETRIC_FINGERPRINT_LOGIN',
    'BIOMETRIC_IRIS_LOGIN',
    'BIOMETRIC_REGISTRATION'
  ]

  const profileActions = [
    'PROFILE_UPDATE',
    'PROFILE_VIEW',
    'ACCOUNT_SOFT_DELETE'
  ]

  const medicalActions = [
    'ENCOUNTER_CREATED',
    'ENCOUNTER_UPDATED',
    'ENCOUNTER_VIEWED',
    'DOCUMENT_UPLOADED',
    'DOCUMENT_VIEWED',
    'DOCUMENT_DOWNLOADED',
    'DOCUMENT_DELETED'
  ]

  const emergencyActions = [
    'EMERGENCY_ACCESS_ATTEMPT',
    'EMERGENCY_SESSION_CREATED',
    'EMERGENCY_SESSION_REVOKED',
    'PATIENT_DATA_ACCESSED'
  ]

  if (authActions.includes(actionType)) {
    return 'auth'
  } else if (profileActions.includes(actionType)) {
    return 'profile'
  } else if (medicalActions.includes(actionType)) {
    return 'medical'
  } else if (emergencyActions.includes(actionType)) {
    return 'emergency'
  } else {
    return 'system'
  }
}

/**
 * Format audit details for display
 */
export function formatAuditDetails(actionType: string, details: any): string {
  switch (actionType) {
    case 'LOGIN_SUCCESS':
    case 'LOGIN_FAILED':
      return `Login attempt from ${details.method || 'unknown method'}`

    case 'OTP_GENERATED':
      return `OTP generated for ${details.purpose || 'login'}`

    case 'OTP_VERIFICATION_FAILED':
      return `OTP verification failed (${details.attempts || 0} attempts)`

    case 'PROFILE_UPDATE':
      const fields = details.updatedFields || []
      return `Updated fields: ${fields.join(', ')}`

    case 'ENCOUNTER_CREATED':
      return `Created ${details.type || 'encounter'} for ${details.occurredAt ? new Date(details.occurredAt).toLocaleDateString() : 'unknown date'}`

    case 'ENCOUNTER_UPDATED':
      const updatedFields = details.updatedFields || []
      return `Updated encounter fields: ${updatedFields.join(', ')}`

    case 'DOCUMENT_UPLOADED':
      return `Uploaded "${details.filename || 'unknown file'}" (${details.mimetype || 'unknown type'})`

    case 'DOCUMENT_DOWNLOADED':
      return `Downloaded "${details.filename || 'unknown file'}"`

    case 'EMERGENCY_ACCESS_ATTEMPT':
      return `Emergency access ${details.result || 'attempted'}: ${details.reason || 'No reason provided'}`

    case 'EMERGENCY_SESSION_CREATED':
      return `Emergency session created for "${details.reason || 'No reason provided'}" (${details.method || 'unknown method'})`

    case 'PATIENT_DATA_ACCESSED':
      return `Patient data accessed during emergency session`

    case 'EMERGENCY_SESSION_REVOKED':
      return `Emergency session revoked`

    case 'BIOMETRIC_FINGERPRINT_LOGIN':
      return `Logged in using fingerprint authentication`

    case 'BIOMETRIC_IRIS_LOGIN':
      return `Logged in using iris authentication`

    case 'ACCOUNT_SOFT_DELETE':
      return `Account deactivated for ${details.patientName || 'patient'}`

    default:
      // Try to extract meaningful information from details
      if (details.reason) {
        return details.reason
      } else if (details.message) {
        return details.message
      } else if (details.action) {
        return details.action
      } else {
        return 'Action performed'
      }
  }
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  const colorMap = {
    low: 'green',
    medium: 'yellow',
    high: 'red'
  }
  return colorMap[severity]
}

/**
 * Get category color for UI
 */
export function getCategoryColor(category: 'auth' | 'profile' | 'medical' | 'emergency' | 'system'): string {
  const colorMap = {
    auth: 'blue',
    profile: 'purple',
    medical: 'green',
    emergency: 'red',
    system: 'gray'
  }
  return colorMap[category]
}

/**
 * Group audit logs by date
 */
export function groupAuditLogsByDate(logs: any[]): Record<string, any[]> {
  return logs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, any[]>)
}

/**
 * Group audit logs by category
 */
export function groupAuditLogsByCategory(logs: any[]): Record<string, any[]> {
  return logs.reduce((groups, log) => {
    const category = getActionCategory(log.actionType)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(log)
    return groups
  }, {} as Record<string, any[]>)
}

/**
 * Filter audit logs by time range
 */
export function filterAuditLogsByTimeRange(
  logs: any[],
  timeRange: 'today' | 'week' | 'month' | 'year' | 'all'
): any[] {
  if (timeRange === 'all') {
    return logs
  }

  const now = new Date()
  let cutoffDate: Date

  switch (timeRange) {
    case 'today':
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      cutoffDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return logs
  }

  return logs.filter(log => new Date(log.timestamp) >= cutoffDate)
}

/**
 * Get audit log summary statistics
 */
export function getAuditLogSummary(logs: any[]): {
  totalLogs: number
  categoryCounts: Record<string, number>
  severityCounts: Record<string, number>
  recentActivity: number
  topActors: Array<{ name: string; count: number }>
} {
  const categoryCounts: Record<string, number> = {}
  const severityCounts: Record<string, number> = {}
  const actorCounts: Record<string, number> = {}

  // Count recent activity (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentActivity = logs.filter(log => new Date(log.timestamp) > oneDayAgo).length

  logs.forEach(log => {
    // Count by category
    const category = getActionCategory(log.actionType)
    categoryCounts[category] = (categoryCounts[category] || 0) + 1

    // Count by severity
    const severity = getActionSeverity(log.actionType)
    severityCounts[severity] = (severityCounts[severity] || 0) + 1

    // Count by actor
    const actor = log.actorName || 'System'
    actorCounts[actor] = (actorCounts[actor] || 0) + 1
  })

  // Get top 5 actors
  const topActors = Object.entries(actorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return {
    totalLogs: logs.length,
    categoryCounts,
    severityCounts,
    recentActivity,
    topActors
  }
}

/**
 * Generate audit log report
 */
export function generateAuditReport(logs: any[], title: string = 'Audit Log Report'): string {
  const summary = getAuditLogSummary(logs)
  const groupedByDate = groupAuditLogsByDate(logs)

  let report = `${title}\n`
  report += `Generated: ${new Date().toLocaleString()}\n\n`

  report += `SUMMARY\n`
  report += `=======\n`
  report += `Total Logs: ${summary.totalLogs}\n`
  report += `Recent Activity (24h): ${summary.recentActivity}\n\n`

  report += `By Category:\n`
  Object.entries(summary.categoryCounts).forEach(([category, count]) => {
    report += `  ${category}: ${count}\n`
  })

  report += `\nBy Severity:\n`
  Object.entries(summary.severityCounts).forEach(([severity, count]) => {
    report += `  ${severity}: ${count}\n`
  })

  report += `\nTop Actors:\n`
  summary.topActors.forEach(({ name, count }) => {
    report += `  ${name}: ${count}\n`
  })

  report += `\n\nDETAILED LOGS\n`
  report += `============\n`

  Object.entries(groupedByDate)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .forEach(([date, dateLogs]) => {
      report += `\n${date}\n`
      report += `-`.repeat(date.length) + `\n`
      
      dateLogs.forEach(log => {
        const formatted = formatAuditLogForDisplay(log)
        report += `${formatted.timestamp} | ${formatted.actor} | ${formatted.action} | ${formatted.details}\n`
      })
    })

  return report
}