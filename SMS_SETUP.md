# SMS OTP Integration Setup

This guide explains how to set up real SMS OTP delivery using Twilio for the E-Patient Connect application.

## Current Status

- ✅ SMS service integrated with Twilio
- ✅ Development mode with console logging
- ✅ Production mode with real SMS delivery
- ✅ Fallback handling for SMS failures
- ✅ Phone number formatting for international numbers

## Quick Setup

### 1. Get Twilio Credentials

1. Sign up at [Twilio.com](https://www.twilio.com)
2. Go to the [Twilio Console](https://console.twilio.com/)
3. Note down your **Account SID** and **Auth Token**
4. Purchase a phone number with SMS capabilities

### 2. Update Environment Variables

Add these to your `.env` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID="your_account_sid_here"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"

# Enable SMS (set to "true" for production)
SMS_ENABLED="true"
```

### 3. Restart the Application

```bash
npm run dev
```

## Testing SMS Integration

### Option 1: Use the SMS Configuration Page

1. Go to `http://localhost:3000/admin/sms-config` (development mode only)
2. Check the configuration status
3. Test SMS delivery with a real phone number

### Option 2: Test via Registration/Login

1. Go to patient registration or login
2. Enter a real phone number
3. Generate OTP - you should receive an SMS

## SMS Features

### Development Mode
- **SMS_ENABLED="false"** or not set
- OTPs are logged to console
- OTPs are shown in the UI
- No actual SMS sent
- No Twilio charges

### Production Mode
- **SMS_ENABLED="true"**
- Real SMS sent via Twilio
- OTPs not shown in UI
- Twilio charges apply
- Proper error handling

### Phone Number Formatting
- Automatically adds +91 for 10-digit Indian numbers
- Supports international format (+country_code)
- Validates phone number format

### SMS Message Templates
- **Registration**: "Welcome to E-Patient Connect! Your registration OTP is: 123456..."
- **Login**: "Your E-Patient Connect login OTP is: 123456..."
- **Emergency**: "E-Patient Connect Emergency Access OTP: 123456..."

## Error Handling

### SMS Delivery Failures
- Application continues to work even if SMS fails
- User gets appropriate error messages
- OTP is still valid if generated successfully
- Fallback to development mode display if needed

### Common Error Codes
- **21211**: Invalid phone number format
- **21614**: Phone number not valid for SMS
- **21408**: SMS service temporarily unavailable

## Security Features

- OTPs expire after 5 minutes
- Maximum 3 attempts per OTP
- Rate limiting on OTP generation
- Audit logging for all OTP activities
- Secure storage with bcrypt hashing

## Cost Considerations

### Twilio Pricing (approximate)
- SMS: $0.0075 per message (US)
- SMS: $0.0395 per message (India)
- Phone number: $1/month

### Optimization Tips
- Use development mode for testing
- Enable SMS only in production
- Monitor usage in Twilio console
- Set up billing alerts

## Troubleshooting

### SMS Not Received
1. Check phone number format
2. Verify Twilio credentials
3. Check Twilio console for delivery status
4. Ensure phone number is SMS-capable
5. Check spam/blocked messages

### Configuration Issues
1. Verify all environment variables are set
2. Restart application after .env changes
3. Check SMS status at `/admin/sms-config`
4. Review server logs for errors

### Development vs Production
- Development: OTP shown in UI and console
- Production: OTP only sent via SMS
- Use SMS_ENABLED to control mode

## API Endpoints

- `POST /api/auth/otp/generate` - Generate and send OTP
- `POST /api/auth/otp/verify` - Verify OTP
- `GET /api/sms/status` - Check SMS service status

## Integration with Other Services

The SMS service can be extended to support:
- AWS SNS
- Firebase Cloud Messaging
- Other SMS providers

Simply implement the `SMSResult` interface in a new service class.