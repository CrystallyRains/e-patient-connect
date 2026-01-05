import { database } from '../database'

/**
 * Utility functions for authentication system
 */

/**
 * Find user by identifier (mobile or email)
 */
export async function findUserByIdentifier(identifier: string) {
  try {
    const [users] = await database.execute(
      'SELECT id, role, name, mobile, email, hospital_id FROM users WHERE mobile = ? OR email = ?',
      [identifier, identifier]
    ) as any

    return users && users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Find user error:', error)
    return null
  }
}

/**
 * Get user with profile information
 */
export async function getUserWithProfile(userId: string) {
  try {
    const [users] = await database.execute(`
      SELECT 
        u.id, u.role, u.name, u.mobile, u.email, u.hospital_id, u.created_at,
        pp.id_proof_type, pp.id_proof_number, pp.emergency_contact, pp.family_member_id,
        pp.biometric_fingerprint_ref, pp.biometric_iris_ref, pp.deleted_at,
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

    return users && users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Get user with profile error:', error)
    return null
  }
}

/**
 * Check if user account is active (not soft deleted)
 */
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const [users] = await database.execute(
      'SELECT u.id, pp.deleted_at FROM users u LEFT JOIN patient_profiles pp ON u.id = pp.user_id WHERE u.id = ?',
      [userId]
    ) as any

    if (!users || users.length === 0) {
      return false
    }

    const user = users[0]
    
    // Check if patient account is soft deleted
    if (user.deleted_at) {
      return false
    }

    return true
  } catch (error) {
    console.error('Check user active error:', error)
    return false
  }
}

/**
 * Validate identifier format (basic validation)
 */
export function validateIdentifier(identifier: string): { isValid: boolean; type: 'mobile' | 'email' | 'unknown' } {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (emailRegex.test(identifier)) {
    return { isValid: true, type: 'email' }
  }

  // Basic mobile validation (supports international format)
  const mobileRegex = /^\+?[\d\s\-\(\)]{10,15}$/
  if (mobileRegex.test(identifier.replace(/\s/g, ''))) {
    return { isValid: true, type: 'mobile' }
  }

  return { isValid: false, type: 'unknown' }
}

/**
 * Generate secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Basic formatting for display
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  return `+${cleaned}`
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * Check rate limiting (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMinutes: number = 15): boolean {
  const now = Date.now()
  const key = sanitizeInput(identifier)
  
  const current = rateLimitMap.get(key)
  
  if (!current) {
    rateLimitMap.set(key, { count: 1, resetTime: now + (windowMinutes * 60 * 1000) })
    return true
  }
  
  if (now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + (windowMinutes * 60 * 1000) })
    return true
  }
  
  if (current.count >= maxAttempts) {
    return false
  }
  
  current.count++
  return true
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimit(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string | null,
  eventType: string,
  details: any,
  success: boolean = true
): Promise<void> {
  try {
    await database.execute(
      'INSERT INTO audit_logs (actor_user_id, actor_role, action_type, details_json) VALUES (?, ?, ?, ?)',
      [
        userId,
        'SYSTEM',
        `AUTH_${eventType}_${success ? 'SUCCESS' : 'FAILED'}`,
        JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
          success
        })
      ]
    )
  } catch (error) {
    console.error('Auth event logging error:', error)
  }
}