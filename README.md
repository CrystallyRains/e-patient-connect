# E-Patient Connect

A patient-owned medical history platform with emergency access capabilities for healthcare providers.

## Features

- **Patient-Owned Medical Records**: Patients maintain complete control over their medical timeline
- **Emergency Access**: Doctors can request time-bound (30-minute) access to patient records
- **Secure Authentication**: OTP and biometric placeholder authentication (no passwords)
- **Document Management**: Hospital operators can upload medical documents
- **Comprehensive Audit Logging**: Complete transparency of who accessed what and when
- **Role-Based Access Control**: Separate interfaces for patients, doctors, and hospital operators

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with direct database access
- **Authentication**: Custom OTP system with biometric placeholders
- **File Storage**: Local filesystem storage

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd e-patient-connect
npm install
```

### 2. Database Setup

The application uses SQLite database which is automatically initialized:

```bash
# Initialize database and create tables
npm run db:init

# Seed with sample data
npm run db:seed
```

### 3. Environment Configuration

Update `.env` file with your configuration:

```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NODE_ENV="development"
UPLOAD_DIR="./uploads"
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Demo User Credentials

After running the seed script, you'll have these demo users:

### 🏥 Patient
- **Name**: John Doe
- **Mobile**: +1234567890
- **Email**: john.doe@example.com

### 👨‍⚕️ Doctor
- **Name**: Dr. Sarah Smith
- **Mobile**: +1234567892
- **Email**: dr.sarah@example.com

### 👨‍💼 Hospital Operator
- **Name**: Mike Johnson
- **Mobile**: +1234567893
- **Email**: mike.operator@example.com
- **Hospital**: City General Hospital

## Authentication Flow

### OTP Authentication
1. Enter mobile number or email
2. System generates 6-digit OTP (valid for 5 minutes)
3. In development mode, OTP is displayed in the UI
4. Enter OTP to complete login

### Biometric Placeholder Authentication
1. Select "Scan Fingerprint" or "Scan Iris"
2. System uses stored biometric reference tokens
3. Placeholder authentication completes login

## Demo Workflow

### 1. Patient Registration and Login
```bash
# Visit: http://localhost:3000/patient/register
# Fill registration form and complete OTP verification
# Login at: http://localhost:3000/patient/login
```

### 2. Patient Dashboard
- View complete medical timeline
- See critical medical information (allergies, blood group, etc.)
- Add new encounters
- View access logs

### 3. Doctor Emergency Access
```bash
# Visit: http://localhost:3000/doctor/emergency
# Enter patient identifier (mobile/email)
# Provide reason for access
# Complete authentication (OTP/biometric)
# Get 30-minute read-only access to patient records
```

### 4. Hospital Operator Document Upload
```bash
# Visit: http://localhost:3000/operator/login
# Login with operator credentials
# Upload documents to patient encounters
# Documents are stored locally and linked to encounters
```

### 5. Audit Log Verification
```bash
# Login as patient
# Visit: http://localhost:3000/patient/logs
# See all actions performed on your data
# Verify doctor access and operator uploads
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Patient registration
- `POST /api/auth/login` - Multi-method login
- `POST /api/auth/otp/generate` - Generate OTP
- `POST /api/auth/otp/verify` - Verify OTP

### Patient
- `GET /api/patient/profile` - Get patient profile
- `PUT /api/patient/profile` - Update patient profile
- `GET /api/patient/encounters` - Get medical timeline
- `POST /api/patient/encounters` - Create encounter
- `GET /api/patient/audit-logs` - Get access logs

### Doctor
- `POST /api/doctor/emergency-access` - Request emergency access
- `GET /api/doctor/session/[sessionId]` - Access patient records

### Operator
- `POST /api/operator/upload` - Upload medical documents

## File Structure

```
e-patient-connect/
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries
│   └── types/               # TypeScript type definitions
├── database/
│   ├── sqlite-schema.sql    # SQLite database schema
│   ├── init.ts             # Database initialization
│   └── seed.ts             # Sample data seeding
├── uploads/                # File storage directory
└── README.md
```

## Development Notes

- **OTP Display**: In development mode, generated OTPs are shown in the UI for easy testing
- **Biometric Placeholders**: Fingerprint and iris authentication use stored reference tokens
- **File Uploads**: Documents are stored in the local `uploads/` directory
- **Session Management**: Emergency access sessions automatically expire after 30 minutes
- **Audit Logging**: All sensitive actions are logged for transparency

## Security Features

- No password authentication anywhere in the system
- Time-bound emergency access sessions
- Comprehensive audit logging
- Role-based access control
- Hospital-specific operator restrictions
- Soft deletion preserves audit trails

## Troubleshooting

### Database Connection Issues
1. Check if SQLite database file exists in `database/` directory
2. Verify database permissions are correct
3. Reinitialize database: `npm run db:init`

### OTP Not Working
1. Check server logs for OTP generation
2. Verify OTP hasn't expired (5-minute limit)
3. In development, OTP should be visible in UI

### File Upload Issues
1. Check `uploads/` directory exists and is writable
2. Verify file size limits
3. Ensure supported file types (PDF, JPG, PNG)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
#
# 🚀 Development Setup

### Quick Start

1. **Initialize Database**
   ```bash
   npm run db:init
   ```

2. **Seed Demo Data**
   ```bash
   npm run db:seed
   npm run db:enhanced-seed  # Optional: Add more demo users
   ```

3. **View Demo Credentials**
   ```bash
   npm run dev:setup
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Visit Application**
   - Main App: http://localhost:3000
   - Demo Credentials: http://localhost:3000/dev-credentials
   - API Health: http://localhost:3000/api/health
   - API Status: http://localhost:3000/api/status

### 🧪 Testing

#### API Testing
```bash
npm run test:api  # Automated API endpoint testing
```

#### Manual Testing Scenarios

**Patient Flow:**
1. Visit `/patient/register` or `/patient/login`
2. Use demo credentials from `/dev-credentials`
3. Check browser console for OTP (development mode)
4. Explore dashboard, medical timeline, and audit logs

**Doctor Emergency Access:**
1. Login as doctor using demo credentials
2. Visit `/doctor/emergency`
3. Enter patient mobile number
4. Provide emergency reason and authenticate
5. Access patient data (10-minute session)

**Hospital Operator:**
1. Login as operator using demo credentials
2. Create encounters for patients
3. Upload medical documents
4. Test hospital boundary restrictions

### 🔧 Development Features

- **OTP Display**: OTPs shown in browser console (development mode)
- **Biometric Placeholders**: Simulated biometric authentication
- **Demo Credentials**: Pre-seeded users for all roles
- **Comprehensive Audit**: All actions logged with timestamps
- **Hospital Boundaries**: Multi-hospital testing scenarios
- **Emergency Sessions**: Time-bound access testing

### 📊 Demo Data

The seed script creates:
- **3 Patients** with different medical histories
- **3 Doctors** from different hospitals
- **3 Hospital Operators** with hospital restrictions
- **3 Hospitals** for boundary testing
- **7+ Medical Encounters** spanning different types
- **5+ Documents** attached to encounters
- **Comprehensive Audit Trail** for transparency testing

### 🔍 API Documentation

- **Full API Docs**: `/API_DOCUMENTATION.md`
- **Health Check**: `GET /api/health`
- **System Status**: `GET /api/status`
- **All Endpoints**: `GET /api` (lists all available endpoints)

### 💡 Development Tips

1. **OTP Testing**: Check browser console for OTPs in development mode
2. **Multi-Hospital**: Test with different operator accounts to verify boundaries
3. **Emergency Access**: Use doctor accounts to test time-bound sessions
4. **Audit Transparency**: Login as patients to view comprehensive audit logs
5. **Document Upload**: Use operator accounts to test file upload restrictions

### 🛠️ Troubleshooting

**Database Issues:**
```bash
# Reinitialize database
npm run db:init
npm run db:seed
```

**Missing Demo Data:**
```bash
# Add more demo users and scenarios
npm run db:enhanced-seed
```

**API Testing:**
```bash
# Test all endpoints
npm run test:api
```

**View Current Setup:**
```bash
# Display all demo credentials and features
npm run dev:setup
```