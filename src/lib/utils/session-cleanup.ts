import { EmergencyService } from '../services/emergency-service'
import { OTPService } from '../auth'

/**
 * Session cleanup utilities
 */

export class SessionCleanup {
  private static cleanupInterval: NodeJS.Timeout | null = null
  private static readonly CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute

  /**
   * Start automatic session cleanup
   */
  static startAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      console.log('⚠️ Session cleanup already running')
      return
    }

    console.log('🧹 Starting automatic session cleanup...')
    
    // Run cleanup immediately
    this.runCleanup()

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup()
    }, this.CLEANUP_INTERVAL_MS)
  }

  /**
   * Stop automatic session cleanup
   */
  static stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('🛑 Stopped automatic session cleanup')
    }
  }

  /**
   * Run cleanup tasks
   */
  static async runCleanup(): Promise<void> {
    try {
      // Cleanup expired emergency sessions
      await EmergencyService.cleanupExpiredSessions()

      // Cleanup expired OTPs
      await OTPService.cleanupExpiredOTPs()

      // Log cleanup completion (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Session cleanup completed')
      }
    } catch (error) {
      console.error('Session cleanup error:', error)
    }
  }

  /**
   * Get cleanup status
   */
  static getCleanupStatus(): { running: boolean; intervalMs: number } {
    return {
      running: this.cleanupInterval !== null,
      intervalMs: this.CLEANUP_INTERVAL_MS
    }
  }
}

/**
 * Initialize session cleanup on module load
 */
if (typeof window === 'undefined') { // Server-side only
  // Start cleanup when the module is loaded
  SessionCleanup.startAutomaticCleanup()

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down session cleanup...')
    SessionCleanup.stopAutomaticCleanup()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down session cleanup...')
    SessionCleanup.stopAutomaticCleanup()
    process.exit(0)
  })
}