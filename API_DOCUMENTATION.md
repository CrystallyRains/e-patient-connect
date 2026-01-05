# E-Patient Connect API Documentation

## Overview

The E-Patient Connect API provides secure access to patient medical records with role-based authentication and comprehensive audit logging. All endpoints require proper authentication except for health checks and registration.

## Base URL
```
http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format

All API responses follow this structure:
```json
{
  "message": "Success message",
  "data": {}, // Response data
  "error": "Error message" // Only present on errors
}
```

## Error Codes

- `400` - Bad Request (validation errors, missing fields)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Authentication Endpoints

### Generate OTP
```http
POST /api/auth/otp/generate
```

**Request Body:**
```json
{
  "identifier": "string", // mobile or email
  "purpose": "string" // LOGIN, REGISTRATION, EMERGENCY_ACCESS
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "otp": "123456", // Only in development mode
  "developmentMode": true
}
```

### Verify OTP
```http
POST /api/auth/otp/verify
```

**Request Body:**
```json
{
  "identifier": "string",
  "otp": "string",
  "purpose": "string"
}
```

**Response:**
```json
{
  "message": "Authentication successful",
  "token": "jwt_token",
  "user": {
    "userId": "string",
    "role": "PATIENT|DOCTOR|OPERATOR",
    "name": "string",
    "mobile": "string",
    "email": "string"
  }
}
```

### Biometric Authentication
```http
POST /api/auth/biometric/verify
```

**Request Body:**
```json
{
  "identifier": "string",
  "biometricType": "FINGERPRINT|IRIS",
  "biometricData": "string" // placeholder data
}
```

### Multi-Method Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "identifier": "string",
  "method": "OTP|BIOMETRIC",
  "otp": "string", // if method is OTP
  "biometricType": "FINGERPRINT|IRIS", // if method is BIOMETRIC
  "biometricData": "string" // if method is BIOMETRIC
}
```

### Patient Registration
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "string",
  "mobile": "string",
  "email": "string",
  "idProofType": "string",
  "idProofNumber": "string",
  "emergencyContact": "string",
  "familyMemberId": "string", // optional
  "otp": "string",
  "fingerprintData": "string", // optional
  "irisData": "string" // optional
}
```

### Session Validation
```http
GET /api/auth/session/validate
```

**Headers:** `Authorization: Bearer <token>`

### Logout
```http
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

---

## User Management Endpoints

### Get User Profile
```http
GET /api/user/profile
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "string",
    "role": "string",
    "name": "string",
    "mobile": "string",
    "email": "string",
    "profile": {} // role-specific profile data
  }
}
```

### Update Patient Profile
```http
PUT /api/user/profile
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

**Request Body:**
```json
{
  "name": "string",
  "mobile": "string",
  "email": "string",
  "emergencyContact": "string",
  "familyMemberId": "string"
}
```

### Delete Patient Account
```http
DELETE /api/user/profile
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

### Get User Audit Logs
```http
GET /api/user/audit-logs?limit=50
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

### Register Biometrics
```http
POST /api/user/biometrics
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

**Request Body:**
```json
{
  "fingerprintData": "string", // optional
  "irisData": "string" // optional
}
```

### Get Biometric Status
```http
GET /api/user/biometrics
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

---

## Medical Timeline Endpoints

### Get Patient Encounters
```http
GET /api/encounters?patientId=<id>&startDate=<date>&endDate=<date>&type=<type>&limit=20&offset=0
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT (own data), DOCTOR (with emergency session)

**Query Parameters:**
- `patientId`: Patient ID (optional for patients, required for doctors)
- `startDate`: Filter from date (ISO string)
- `endDate`: Filter to date (ISO string)
- `type`: Encounter type filter
- `limit`: Number of results (default 20)
- `offset`: Pagination offset

### Create Encounter
```http
POST /api/encounters
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT, OPERATOR

**Request Body:**
```json
{
  "patientUserId": "string", // required for operators
  "occurredAt": "string", // ISO date
  "type": "string",
  "reasonDiagnosis": "string",
  "prescriptionsNotes": "string",
  "allergiesSnapshot": "string", // optional
  "chronicSnapshot": "string", // optional
  "bloodGroup": "string", // optional
  "recentSurgery": "string", // optional
  "hospitalId": "string" // optional
}
```

### Get Specific Encounter
```http
GET /api/encounters/<encounterId>
```

**Headers:** `Authorization: Bearer <token>`

### Update Encounter
```http
PUT /api/encounters/<encounterId>
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT (own encounters), OPERATOR (own created encounters)

### Get Critical Medical Info
```http
GET /api/patient/critical-info?patientId=<id>
```

**Headers:** `Authorization: Bearer <token>`

### Get Patient Statistics
```http
GET /api/patient/stats?patientId=<id>
```

**Headers:** `Authorization: Bearer <token>`

---

## Emergency Access Endpoints

### Request Emergency Access
```http
POST /api/emergency/request
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** DOCTOR only

**Request Body:**
```json
{
  "patientIdentifier": "string",
  "reason": "string",
  "hospitalName": "string", // optional
  "authMethod": "OTP|FINGERPRINT|IRIS",
  "authData": "string" // OTP or biometric data
}
```

**Response:**
```json
{
  "message": "Emergency access granted successfully",
  "sessionId": "string",
  "sessionToken": "string",
  "expiresAt": "string", // ISO date
  "patientInfo": {
    "id": "string",
    "name": "string",
    "mobile": "string",
    "email": "string"
  }
}
```

### Access Patient Data (Emergency Session)
```http
GET /api/emergency/session/<sessionId>
```

**Headers:** `Authorization: Bearer <emergency_token>`
**Roles:** DOCTOR with active emergency session

**Response:**
```json
{
  "message": "Patient data retrieved successfully",
  "sessionInfo": {},
  "patientProfile": {},
  "medicalTimeline": [],
  "criticalInfo": {}
}
```

### Revoke Emergency Session
```http
DELETE /api/emergency/session/<sessionId>
```

**Headers:** `Authorization: Bearer <emergency_token>`

### Get Doctor's Active Sessions
```http
GET /api/emergency/sessions
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** DOCTOR only

### Get Patient Emergency History
```http
GET /api/patient/emergency-history?limit=50
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

---

## Document Management Endpoints

### Upload Document
```http
POST /api/documents/upload
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** OPERATOR only
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Document file (PDF, JPG, PNG)
- `encounterId`: Encounter ID
- `patientUserId`: Patient ID
- `hospitalId`: Hospital ID

### Get Documents
```http
GET /api/documents?patientId=<id>&encounterId=<id>&hospitalId=<id>&mimetype=<type>&limit=20
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `patientId`: Filter by patient
- `encounterId`: Filter by encounter
- `hospitalId`: Filter by hospital
- `mimetype`: Filter by file type
- `startDate`: Filter from date
- `endDate`: Filter to date
- `limit`: Number of results
- `offset`: Pagination offset

### Download Document
```http
GET /api/documents/<documentId>
```

**Headers:** `Authorization: Bearer <token>`

**Response:** Binary file with appropriate headers

### Delete Document
```http
DELETE /api/documents/<documentId>
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** OPERATOR only (same hospital)

### Get Document Statistics
```http
GET /api/documents/stats?patientId=<id>
```

**Headers:** `Authorization: Bearer <token>`

---

## Operator Endpoints

### Get Hospital Encounters
```http
GET /api/operator/encounters?patientIdentifier=<identifier>&limit=20
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** OPERATOR only

### Create Hospital Encounter
```http
POST /api/operator/encounters
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** OPERATOR only

**Request Body:**
```json
{
  "patientIdentifier": "string",
  "occurredAt": "string",
  "type": "string",
  "reasonDiagnosis": "string",
  "prescriptionsNotes": "string",
  "allergiesSnapshot": "string",
  "chronicSnapshot": "string",
  "bloodGroup": "string",
  "recentSurgery": "string"
}
```

---

## Audit Logging Endpoints

### Get Audit Logs
```http
GET /api/audit/logs?patientId=<id>&actorRole=<role>&actionType=<type>&search=<term>&limit=50
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT (own logs), DOCTOR (with emergency session)

**Query Parameters:**
- `patientId`: Filter by patient
- `actorRole`: Filter by actor role
- `actionType`: Filter by action type
- `startDate`: Filter from date
- `endDate`: Filter to date
- `search`: Search term
- `limit`: Number of results
- `offset`: Pagination offset

### Get Audit Statistics
```http
GET /api/audit/stats?patientId=<id>&actorRole=<role>
```

**Headers:** `Authorization: Bearer <token>`

### Get Emergency Access Audit
```http
GET /api/audit/emergency?patientId=<id>
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT, DOCTOR

### Export Audit Logs
```http
GET /api/audit/export?patientId=<id>&startDate=<date>&endDate=<date>
```

**Headers:** `Authorization: Bearer <token>`
**Roles:** PATIENT only

**Response:** CSV file download

---

## System Endpoints

### Health Check
```http
GET /api/health
```

**No authentication required**

**Response:**
```json
{
  "status": "healthy|unhealthy",
  "timestamp": "string",
  "version": "1.0.0",
  "services": {
    "database": "connected|disconnected",
    "environment": {
      "jwtSecret": true,
      "dbConfig": true,
      "uploadDir": true
    }
  }
}
```

### Manual Cleanup
```http
POST /api/admin/cleanup
```

**No authentication required (development only)**

### Get Cleanup Status
```http
GET /api/admin/cleanup
```

**No authentication required (development only)**

---

## Rate Limiting

- OTP generation: 5 requests per 15 minutes per identifier
- Login attempts: 10 requests per 15 minutes per identifier
- Emergency access: 3 requests per hour per doctor
- Document upload: 50 requests per hour per operator

## File Upload Limits

- Maximum file size: 10MB
- Allowed formats: PDF, JPG, JPEG, PNG
- Maximum filename length: 255 characters

## Session Management

- Regular sessions: 24 hours
- Emergency sessions: 30 minutes (auto-expire)
- Session cleanup: Automatic every minute
- OTP expiry: 5 minutes

## Development Features

- OTP display in development mode
- Demo user credentials shown in UI
- Health check endpoint for monitoring
- Comprehensive error logging
- Manual cleanup endpoints

## Security Features

- No password authentication anywhere
- JWT-based session management
- Role-based access control
- Hospital boundary enforcement
- Comprehensive audit logging
- Time-bound emergency access
- File type validation
- Input sanitization
- Rate limiting protection