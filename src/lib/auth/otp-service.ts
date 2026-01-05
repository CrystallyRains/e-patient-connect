import bcrypt from 'bcryptjs'
import { executeSQLiteQuery } from '../../../database/sqlite'
import { smsService } from '../services/sms-service'

export interface OTPResult {
  success: boolean
  message: string
  otp?: string // Only returned in development mode
  smsStatus?: string // SMS delivery status
}

export interface OTPVerificationResult {
  success: boolean
  message: string
  userId?: string
}

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

/**
 * Generate a new OTP for a user
 */
export async function generateOTP(identifier: string, purpose: string = 'LOGIN'): Promise<OTPResult> {
  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = await bcrypt.hash(otp, 10)

    // Calculate expiry time
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES)

    let userId: string
    let phoneNumber: string
    let userName: string = 'User'

    // For registration, we don't need to check if user exists
    if (purpose === 'REGISTRATION') {
      userId = identifier // Use identifier as temporary user_id for registration
      phoneNumber = identifier // Assume identifier is phone number for registration
      
      // Clean up old registration OTPs for this identifier
      await executeSQLiteQuery(
        'DELETE FROM otps WHERE user_id = ? AND purpose = ?',
        [identifier, purpose]
      )

      // Store new OTP (using identifier as temporary user_id for registration)
      await executeSQLiteQuery(
        'INSERT INTO otps (user_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [identifier, otpHash, purpose, expiresAt]
      )

      console.log(`🔐 Registration OTP Generated for ${identifier}: ${otp}`)
    } else {
      // For login, find existing user
      const users = await executeSQLiteQuery(
        'SELECT id, name, mobile, email FROM users WHERE mobile = ? OR email = ?',
        [identifier, identifier]
      ) as any[]

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'User not found with this mobile number or email'
        }
      }

      const user = users[0]
      userId = user.id
      phoneNumber = user.mobile
      userName = user.name

      // Clean up old OTPs for this user and purpose
      await executeSQLiteQuery(
        'DELETE FROM otps WHERE user_id = ? AND purpose = ?',
        [user.id, purpose]
      )

      // Store new OTP
      await executeSQLiteQuery(
        'INSERT INTO otps (user_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, otpHash, purpose, expiresAt]
      )

      // Log OTP generation
      await logAuditEvent(user.id, 'OTP_GENERATED', {
        purpose,
        identifier,
        expiresAt: expiresAt.toISOString()
      })

      console.log(`🔐 OTP Generated for ${user.name} (${identifier}): ${otp}`)
    }

    // Send SMS OTP
    let smsStatus = 'not_sent'
    try {
      const smsResult = await smsService.sendOTP(phoneNumber, otp, purpose)
      smsStatus = smsResult.success ? 'sent' : 'failed'
      
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.message)
        // Don't fail the entire OTP generation if SMS fails
        // The OTP is still valid and can be used if user receives it through other means
      }
    } catch (smsError) {
      console.error('SMS service error:', smsError)
      smsStatus = 'error'
    }

    // Determine response message based on SMS status and environment
    let responseMessage = 'OTP generated successfully'
    if (smsStatus === 'sent') {
      responseMessage = `OTP sent to ${phoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, '$1****$3')}`
    } else if (smsStatus === 'failed' || smsStatus === 'error') {
      responseMessage = 'OTP generated but SMS delivery failed. Please check your phone number.'
    }

    return {
      success: true,
      message: responseMessage,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      smsStatus
    }

  } catch (error) {
    console.error('OTP generation error:', error)
    return {
      success: false,
      message: 'Failed to generate OTP. Please try again.'
    }
  }
}

/**
 * Verify OTP for a user
 */
export async function verifyOTP(identifier: string, otp: string, purpose: string = 'LOGIN'): Promise<OTPVerificationResult> {
  try {
    let userId: string

    if (purpose === 'REGISTRATION') {
      // For registration, use identifier as the temporary user_id
      userId = identifier
    } else {
      // For login, find existing user
      const users = await executeSQLiteQuery(
        'SELECT id, name, mobile, email FROM users WHERE mobile = ? OR email = ?',
        [identifier, identifier]
      ) as any[]

      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      userId = users[0].id
    }

    // Get active OTP
    const otps = await executeSQLiteQuery(
      'SELECT id, code_hash, expires_at, attempts FROM otps WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
      [userId, purpose]
    ) as any[]

    if (!otps || otps.length === 0) {
      if (purpose !== 'REGISTRATION') {
        await logAuditEvent(userId, 'OTP_VERIFICATION_FAILED', {
          reason: 'No OTP found',
          identifier
        })
      }
      return {
        success: false,
        message: 'No OTP found. Please generate a new one.'
      }
    }

    const otpRecord = otps[0]

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      await executeSQLiteQuery('DELETE FROM otps WHERE id = ?', [otpRecord.id])
      if (purpose !== 'REGISTRATION') {
        await logAuditEvent(userId, 'OTP_VERIFICATION_FAILED', {
          reason: 'OTP expired',
          identifier
        })
      }
      return {
        success: false,
        message: 'OTP has expired. Please generate a new one.'
      }
    }

    // Check attempt limit
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await executeSQLiteQuery('DELETE FROM otps WHERE id = ?', [otpRecord.id])
      if (purpose !== 'REGISTRATION') {
        await logAuditEvent(userId, 'OTP_VERIFICATION_FAILED', {
          reason: 'Max attempts exceeded',
          identifier
        })
      }
      return {
        success: false,
        message: 'Maximum attempts exceeded. Please generate a new OTP.'
      }
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.code_hash)

    if (!isValid) {
      // Increment attempts
      await executeSQLiteQuery(
        'UPDATE otps SET attempts = attempts + 1 WHERE id = ?',
        [otpRecord.id]
      )
      if (purpose !== 'REGISTRATION') {
        await logAuditEvent(userId, 'OTP_VERIFICATION_FAILED', {
          reason: 'Invalid OTP',
          identifier,
          attempts: otpRecord.attempts + 1
        })
      }
      return {
        success: false,
        message: `Invalid OTP. ${MAX_ATTEMPTS - otpRecord.attempts - 1} attempts remaining.`
      }
    }

    // OTP is valid - clean up
    await executeSQLiteQuery('DELETE FROM otps WHERE id = ?', [otpRecord.id])
    
    // Log successful verification (only for existing users)
    if (purpose !== 'REGISTRATION') {
      await logAuditEvent(userId, 'OTP_VERIFICATION_SUCCESS', {
        purpose,
        identifier
      })
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      userId: purpose === 'REGISTRATION' ? identifier : userId
    }

  } catch (error) {
    console.error('OTP verification error:', error)
    return {
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    }
  }
}

/**
 * Clean up expired OTPs
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    await executeSQLiteQuery('DELETE FROM otps WHERE expires_at < datetime("now")')
  } catch (error) {
    console.error('OTP cleanup error:', error)
  }
}

/**
 * Log audit events
 */
async function logAuditEvent(userId: string, actionType: string, details: any): Promise<void> {
  try {
    await executeSQLiteQuery(
      'INSERT INTO audit_logs (actor_user_id, actor_role, action_type, details_json) VALUES (?, ?, ?, ?)',
      [userId, 'SYSTEM', actionType, JSON.stringify(details)]
    )
  } catch (error) {
    console.error('Audit logging error:', error)
  }
}

// Export as a service object for backward compatibility
export const OTPService = {
  generateOTP,
  verifyOTP,
  cleanupExpiredOTPs
}