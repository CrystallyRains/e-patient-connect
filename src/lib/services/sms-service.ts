import twilio from 'twilio'

export interface SMSResult {
  success: boolean
  message: string
  messageId?: string
}

class SMSService {
  private client: twilio.Twilio | null = null
  private isEnabled: boolean = false

  constructor() {
    this.initializeTwilio()
  }

  private initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const smsEnabled = process.env.SMS_ENABLED === 'true'

    if (smsEnabled && accountSid && authToken) {
      try {
        this.client = twilio(accountSid, authToken)
        this.isEnabled = true
        console.log('✅ Twilio SMS service initialized')
      } catch (error) {
        console.error('❌ Failed to initialize Twilio:', error)
        this.isEnabled = false
      }
    } else {
      console.log('📱 SMS service disabled - using development mode')
      this.isEnabled = false
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string, purpose: string = 'LOGIN'): Promise<SMSResult> {
    // Format phone number (ensure it starts with country code)
    const formattedPhone = this.formatPhoneNumber(phoneNumber)
    
    if (!this.isEnabled || !this.client) {
      console.log(`📱 [DEV MODE] SMS to ${formattedPhone}: Your OTP is ${otp}`)
      return {
        success: true,
        message: 'OTP sent successfully (development mode)',
        messageId: 'dev-mode-' + Date.now()
      }
    }

    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
      if (!twilioPhoneNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured')
      }

      const messageBody = this.createOTPMessage(otp, purpose)

      const message = await this.client.messages.create({
        body: messageBody,
        from: twilioPhoneNumber,
        to: formattedPhone
      })

      console.log(`✅ SMS sent successfully to ${formattedPhone}, SID: ${message.sid}`)

      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: message.sid
      }

    } catch (error: any) {
      console.error('❌ SMS sending failed:', error)
      
      // Return user-friendly error messages
      let errorMessage = 'Failed to send SMS. Please try again.'
      
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format. Please check and try again.'
      } else if (error.code === 21614) {
        errorMessage = 'Phone number is not valid for SMS delivery.'
      } else if (error.code === 21408) {
        errorMessage = 'SMS service temporarily unavailable. Please try again later.'
      }

      return {
        success: false,
        message: errorMessage
      }
    }
  }

  /**
   * Send general SMS (for other notifications)
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SMSResult> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber)
    
    if (!this.isEnabled || !this.client) {
      console.log(`📱 [DEV MODE] SMS to ${formattedPhone}: ${message}`)
      return {
        success: true,
        message: 'SMS sent successfully (development mode)',
        messageId: 'dev-mode-' + Date.now()
      }
    }

    try {
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
      if (!twilioPhoneNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured')
      }

      const smsMessage = await this.client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: formattedPhone
      })

      console.log(`✅ SMS sent successfully to ${formattedPhone}, SID: ${smsMessage.sid}`)

      return {
        success: true,
        message: 'SMS sent successfully',
        messageId: smsMessage.sid
      }

    } catch (error: any) {
      console.error('❌ SMS sending failed:', error)
      return {
        success: false,
        message: 'Failed to send SMS. Please try again.'
      }
    }
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // If it's an Indian number (10 digits), add +91
    if (cleaned.length === 10) {
      return `+91${cleaned}`
    }
    
    // If it already has country code but no +, add it
    if (cleaned.length > 10 && !phoneNumber.startsWith('+')) {
      return `+${cleaned}`
    }
    
    // Return as is if it already has proper format
    return phoneNumber
  }

  /**
   * Create OTP message based on purpose
   */
  private createOTPMessage(otp: string, purpose: string): string {
    const appName = 'E-Patient Connect'
    
    switch (purpose) {
      case 'REGISTRATION':
        return `Welcome to ${appName}! Your registration OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`
      
      case 'LOGIN':
        return `Your ${appName} login OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`
      
      case 'EMERGENCY_ACCESS':
        return `${appName} Emergency Access OTP: ${otp}. Valid for 5 minutes. Use only for medical emergencies.`
      
      default:
        return `Your ${appName} verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
    }
  }

  /**
   * Check if SMS service is enabled and configured
   */
  isConfigured(): boolean {
    return this.isEnabled
  }

  /**
   * Get service status for debugging
   */
  getStatus(): { enabled: boolean; configured: boolean; mode: string } {
    return {
      enabled: this.isEnabled,
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      mode: this.isEnabled ? 'production' : 'development'
    }
  }
}

// Export singleton instance
export const smsService = new SMSService()
export default smsService