// Authentication Services
export { OTPService } from './otp-service'
export type { OTPResult, OTPVerificationResult } from './otp-service'

export { BiometricService } from './biometric-service'
export type { BiometricResult, BiometricType } from './biometric-service'

export { SessionService } from './session-service'
export type { SessionData, EmergencySessionData, SessionResult } from './session-service'

// Authentication Middleware
export {
  authenticateRequest,
  authenticatePatient,
  authenticateDoctor,
  authenticateOperator,
  authenticateEmergencySession,
  getUserFromRequest,
  canAccessPatientData,
  validateEmergencyAccess
} from './middleware'
export type { AuthenticatedRequest, UserRole } from './middleware'

// Utility functions
export {
  findUserByIdentifier,
  getUserWithProfile,
  isUserActive,
  validateIdentifier,
  generateSecureRandom,
  formatPhoneNumber,
  sanitizeInput,
  checkRateLimit,
  cleanupRateLimit,
  logAuthEvent
} from './utils'

export const AUTH_CONSTANTS = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  REGULAR_SESSION_HOURS: 24,
  EMERGENCY_SESSION_MINUTES: 10,
  MAX_OTP_ATTEMPTS: 3
}