/**
 * Emergency access utility functions
 */

export const EMERGENCY_REASONS = [
  'Cardiac Emergency',
  'Respiratory Distress',
  'Trauma/Accident',
  'Allergic Reaction',
  'Drug Overdose',
  'Stroke Symptoms',
  'Seizure',
  'Unconscious Patient',
  'Severe Pain',
  'Mental Health Crisis',
  'Other Medical Emergency'
] as const

export type EmergencyReason = typeof EMERGENCY_REASONS[number]

export const AUTH_METHODS = [
  'OTP',
  'FINGERPRINT', 
  'IRIS'
] as const

export type AuthMethod = typeof AUTH_METHODS[number]

/**
 * Validate emergency reason
 */
export function isValidEmergencyReason(reason: string): boolean {
  return reason && reason.trim().length >= 10
}

/**
 * Validate authentication method
 */
export function isValidAuthMethod(method: string): method is AuthMethod {
  return AUTH_METHODS.includes(method as AuthMethod)
}

/**
 * Format emergency session duration
 */
export function formatSessionDuration(minutes: number): string {
  if (minutes <= 0) {
    return 'Expired'
  }
  
  if (minutes === 1) {
    return '1 minute remaining'
  }
  
  return `${minutes} minutes remaining`
}

/**
 * Get session urgency level
 */
export function getSessionUrgency(remainingMinutes: number): 'high' | 'medium' | 'low' | 'expired' {
  if (remainingMinutes <= 0) {
    return 'expired'
  } else if (remainingMinutes <= 2) {
    return 'high'
  } else if (remainingMinutes <= 5) {
    return 'medium'
  } else {
    return 'low'
  }
}

/**
 * Format emergency access timestamp
 */
export function formatEmergencyTimestamp(date: Date | string): string {
  const accessDate = typeof date === 'string' ? new Date(date) : date
  
  return accessDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Calculate time elapsed since emergency access
 */
export function getTimeElapsed(date: Date | string): string {
  const accessDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - accessDate.getTime()
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

/**
 * Get emergency access status color
 */
export function getAccessStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'ACTIVE': 'green',
    'EXPIRED': 'red',
    'REVOKED': 'orange'
  }
  
  return colorMap[status] || 'gray'
}

/**
 * Get authentication method icon
 */
export function getAuthMethodIcon(method: string): string {
  const iconMap: Record<string, string> = {
    'OTP': '📱',
    'FINGERPRINT': '👆',
    'IRIS': '👁️'
  }
  
  return iconMap[method] || '🔐'
}

/**
 * Validate patient identifier format
 */
export function validatePatientIdentifier(identifier: string): { 
  isValid: boolean
  type: 'mobile' | 'email' | 'id' | 'unknown'
  formatted?: string
} {
  if (!identifier || identifier.trim().length === 0) {
    return { isValid: false, type: 'unknown' }
  }

  const trimmed = identifier.trim()

  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (emailRegex.test(trimmed)) {
    return { 
      isValid: true, 
      type: 'email',
      formatted: trimmed.toLowerCase()
    }
  }

  // Check if it's a mobile number
  const mobileRegex = /^\+?[\d\s\-\(\)]{10,15}$/
  if (mobileRegex.test(trimmed.replace(/\s/g, ''))) {
    const cleaned = trimmed.replace(/[^\d+]/g, '')
    return { 
      isValid: true, 
      type: 'mobile',
      formatted: cleaned.startsWith('+') ? cleaned : `+${cleaned}`
    }
  }

  // Check if it's a UUID-like ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(trimmed)) {
    return { 
      isValid: true, 
      type: 'id',
      formatted: trimmed.toLowerCase()
    }
  }

  // Check if it's a numeric ID
  const numericRegex = /^\d+$/
  if (numericRegex.test(trimmed)) {
    return { 
      isValid: true, 
      type: 'id',
      formatted: trimmed
    }
  }

  return { isValid: false, type: 'unknown' }
}

/**
 * Generate emergency access summary
 */
export function generateAccessSummary(sessionInfo: any): string {
  const doctor = sessionInfo.doctorName || 'Unknown Doctor'
  const reason = sessionInfo.reason || 'Emergency access'
  const timestamp = formatEmergencyTimestamp(sessionInfo.grantedAt)
  
  return `${doctor} accessed your records on ${timestamp} for: ${reason}`
}

/**
 * Check if emergency access is still valid
 */
export function isEmergencyAccessValid(expiresAt: Date | string): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return new Date() < expiry
}

/**
 * Calculate session progress percentage
 */
export function calculateSessionProgress(grantedAt: Date | string, expiresAt: Date | string): number {
  const granted = typeof grantedAt === 'string' ? new Date(grantedAt) : grantedAt
  const expires = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const now = new Date()
  
  const totalDuration = expires.getTime() - granted.getTime()
  const elapsed = now.getTime() - granted.getTime()
  
  if (elapsed <= 0) return 0
  if (elapsed >= totalDuration) return 100
  
  return Math.round((elapsed / totalDuration) * 100)
}

/**
 * Get emergency session warning message
 */
export function getSessionWarning(remainingMinutes: number): string | null {
  if (remainingMinutes <= 0) {
    return 'Emergency session has expired'
  } else if (remainingMinutes <= 1) {
    return 'Emergency session expires in less than 1 minute'
  } else if (remainingMinutes <= 2) {
    return `Emergency session expires in ${remainingMinutes} minutes`
  }
  
  return null
}