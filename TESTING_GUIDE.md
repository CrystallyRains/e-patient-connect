# E-Patient Connect Testing Guide

This guide provides comprehensive testing scenarios for all user roles and system features.

## 🚀 Quick Setup for Testing

1. **Initialize System**
   ```bash
   npm run db:init
   npm run db:seed
   npm run dev
   ```

2. **Access Demo Credentials**
   - Visit: http://localhost:3000/dev-credentials
   - Or run: `npm run dev:setup`

3. **Start Testing**
   - Main App: http://localhost:3000
   - API Health: http://localhost:3000/api/health

---

## 👤 Patient Testing Scenarios

### Scenario 1: New Patient Registration

**Objective**: Test complete patient onboarding flow

**Steps**:
1. Visit `/patient/register`
2. Fill registration form:
   - Name: "Test Patient"
   - Mobile: "+1999999999" (new number)
   - Email: "test@example.com" (new email)
   - ID Proof: "Aadhaar"
   - ID Number: "TEST-1234-5678"
   - Emergency Contact: "+1999999998"
3. Click "Generate OTP"
4. Check browser console for OTP (development mode)
5. Enter OTP and complete registration
6. Optionally register biometric placeholders

**Expected Results**:
- ✅ Registration successful
- ✅ OTP displayed in console
- ✅ Redirect to patient dashboard
- ✅ Audit log entry created

### Scenario 2: Existing Patient Login

**Objective**: Test patient authentication flows

**Steps**:
1. Visit `/patient/login`
2. Use demo patient credentials:
   - Mobile: `+1234567890`
   - Email: `john.doe@example.com`
3. Test OTP login:
   - Click "Send OTP"
   - Check console for OTP
   - Enter OTP and login
4. Test biometric login:
   - Click "Scan Fingerprint" or "Scan Iris"
   - Complete placeholder authentication

**Expected Results**:
- ✅ Both authentication methods work
- ✅ Redirect to dashboard
- ✅ Session created successfully

### Scenario 3: Medical Timeline Management

**Objective**: Test patient's medical record management

**Steps**:
1. Login as patient (John Doe)
2. View medical timeline on dashboard
3. Click "Add New Encounter"
4. Fill encounter details:
   - Date: Today's date
   - Type: "Consultation"
   - Reason: "Regular checkup"
   - Prescription: "Continue current medications"
   - Allergies: "Peanuts, Shellfish"
   - Blood Group: "O+"
5. Save encounter
6. Verify it appears in timeline

**Expected Results**:
- ✅ Timeline displays chronologically
- ✅ New encounter saved successfully
- ✅ Critical info updated
- ✅ Audit log entry created

### Scenario 4: Audit Log Transparency

**Objective**: Test patient's ability to view access logs

**Steps**:
1. Login as patient
2. Navigate to "Access Logs" or audit section
3. Review all logged activities
4. Check for:
   - Login events
   - Profile updates
   - Emergency access by doctors
   - Document uploads by operators
5. Test export functionality (if available)

**Expected Results**:
- ✅ All activities logged with timestamps
- ✅ Actor information visible
- ✅ Action details comprehensive
- ✅ Export works correctly

---

## 👨‍⚕️ Doctor Testing Scenarios

### Scenario 5: Emergency Access Request

**Objective**: Test doctor's emergency access to patient records

**Steps**:
1. Login as doctor using demo credentials:
   - Mobile: `+1234567892`
   - Email: `dr.sarah@example.com`
2. Visit `/doctor/emergency`
3. Enter patient identifier: `+1234567890` (John Doe)
4. Provide emergency reason: "Patient unconscious in ER, need medical history"
5. Select authentication method:
   - **OTP**: Check console for OTP
   - **Biometric**: Use fingerprint/iris placeholder
6. Complete authentication
7. Access patient records

**Expected Results**:
- ✅ Emergency session created (30 minutes)
- ✅ Patient medical timeline accessible
- ✅ Critical medical info displayed
- ✅ Session expires automatically
- ✅ Audit log entry created

### Scenario 6: Emergency Session Management

**Objective**: Test time-bound session behavior

**Steps**:
1. Create emergency session (follow Scenario 5)
2. Note session expiry time
3. Access patient data multiple times
4. Wait for session to expire (or test with shorter timeout)
5. Try to access data after expiry

**Expected Results**:
- ✅ Session active for exactly 30 minutes
- ✅ Multiple accesses work within timeframe
- ✅ Access denied after expiry
- ✅ Clear expiry notifications

### Scenario 7: Multiple Patient Access

**Objective**: Test doctor's ability to access multiple patients

**Steps**:
1. Login as doctor
2. Request emergency access for Patient 1 (`+1234567890`)
3. Complete authentication and access records
4. Request emergency access for Patient 2 (`+1234567894`)
5. Complete authentication and access records
6. Verify both sessions are tracked

**Expected Results**:
- ✅ Multiple concurrent sessions allowed
- ✅ Each session tracked separately
- ✅ Patient data isolated correctly
- ✅ All accesses audited

---

## 👨‍💼 Hospital Operator Testing Scenarios

### Scenario 8: Document Upload

**Objective**: Test operator's document management capabilities

**Steps**:
1. Login as operator using demo credentials:
   - Mobile: `+1234567893`
   - Email: `mike.operator@example.com`
2. Navigate to document upload section
3. Select patient: John Doe
4. Select encounter from patient's timeline
5. Upload test document:
   - File: Create a test PDF or use sample image
   - Description: "Lab results"
6. Verify upload success
7. Check document appears in patient's timeline

**Expected Results**:
- ✅ Document uploaded successfully
- ✅ File stored with proper naming
- ✅ Metadata saved correctly
- ✅ Patient can view document
- ✅ Audit log entry created

### Scenario 9: Hospital Boundary Testing

**Objective**: Test hospital-specific access restrictions

**Steps**:
1. Login as Operator 1 (City General Hospital)
2. Try to access patients from other hospitals
3. Try to upload documents for patients from other hospitals
4. Login as Operator 2 (Metro Medical Center)
5. Repeat access attempts
6. Verify restrictions are enforced

**Expected Results**:
- ✅ Operators can only access own hospital patients
- ✅ Cross-hospital access denied
- ✅ Error messages clear and informative
- ✅ Audit logs show access attempts

### Scenario 10: Encounter Creation

**Objective**: Test operator's ability to create patient encounters

**Steps**:
1. Login as operator
2. Navigate to encounter creation
3. Search for patient by mobile/email
4. Create new encounter:
   - Date: Recent date
   - Type: "Lab Test"
   - Reason: "Blood work ordered by Dr. Smith"
   - Results: "All values within normal range"
   - Update critical info if needed
5. Save encounter
6. Verify it appears in patient's timeline

**Expected Results**:
- ✅ Encounter created successfully
- ✅ Patient timeline updated
- ✅ Hospital association correct
- ✅ Audit trail maintained

---

## 🔄 Cross-Role Integration Testing

### Scenario 11: Complete Patient Journey

**Objective**: Test end-to-end patient data flow

**Steps**:
1. **Patient**: Register new patient account
2. **Patient**: Add initial encounter (self-reported)
3. **Operator**: Login and add hospital encounter
4. **Operator**: Upload medical documents
5. **Doctor**: Request emergency access
6. **Doctor**: View complete patient timeline
7. **Patient**: Review audit logs for all activities

**Expected Results**:
- ✅ Data flows correctly between roles
- ✅ All activities properly audited
- ✅ Patient maintains visibility and control
- ✅ Hospital boundaries respected

### Scenario 12: Multi-Hospital Scenario

**Objective**: Test complex multi-hospital interactions

**Steps**:
1. **Patient**: Visit Hospital A (City General)
2. **Operator A**: Create encounter and upload documents
3. **Patient**: Visit Hospital B (Metro Medical)
4. **Operator B**: Create encounter (should work)
5. **Operator B**: Try to access Hospital A data (should fail)
6. **Doctor**: Request emergency access (should see all data)
7. **Patient**: Review audit logs from both hospitals

**Expected Results**:
- ✅ Patient data accessible across hospitals for emergencies
- ✅ Operator access restricted to own hospital
- ✅ Complete audit trail maintained
- ✅ Patient sees all activities

---

## 🧪 API Testing Scenarios

### Scenario 13: Automated API Testing

**Objective**: Test all API endpoints programmatically

**Steps**:
1. Run automated test suite:
   ```bash
   npm run test:api
   ```
2. Review test results
3. Check for any failing endpoints
4. Verify response formats and status codes

**Expected Results**:
- ✅ All endpoints respond correctly
- ✅ Authentication works properly
- ✅ Error handling appropriate
- ✅ Response formats consistent

### Scenario 14: Manual API Testing

**Objective**: Test specific API endpoints manually

**Steps**:
1. Test health check: `GET /api/health`
2. Test OTP generation: `POST /api/auth/otp/generate`
3. Test patient login: `POST /api/auth/login`
4. Test protected endpoints with authentication
5. Test error scenarios (invalid tokens, etc.)

**Expected Results**:
- ✅ Health check shows system status
- ✅ OTP generation works
- ✅ Authentication flows complete
- ✅ Protected endpoints secured
- ✅ Error responses informative

---

## 🔍 Security Testing Scenarios

### Scenario 15: Authentication Security

**Objective**: Test authentication security measures

**Steps**:
1. Test OTP expiry (wait 5+ minutes)
2. Test invalid OTP attempts
3. Test biometric authentication edge cases
4. Test session token validation
5. Test unauthorized access attempts

**Expected Results**:
- ✅ Expired OTPs rejected
- ✅ Invalid attempts logged
- ✅ Sessions properly validated
- ✅ Unauthorized access blocked

### Scenario 16: Data Access Security

**Objective**: Test data access controls

**Steps**:
1. Try to access other patients' data
2. Test role-based restrictions
3. Test hospital boundary enforcement
4. Test emergency session expiry
5. Verify audit logging captures all attempts

**Expected Results**:
- ✅ Cross-patient access blocked
- ✅ Role restrictions enforced
- ✅ Hospital boundaries maintained
- ✅ All attempts audited

---

## 📊 Performance Testing

### Scenario 17: Load Testing

**Objective**: Test system performance under load

**Steps**:
1. Create multiple concurrent sessions
2. Upload multiple documents simultaneously
3. Generate multiple OTPs rapidly
4. Test database query performance
5. Monitor system resources

**Expected Results**:
- ✅ System handles concurrent users
- ✅ File uploads don't block system
- ✅ OTP rate limiting works
- ✅ Database performs adequately

---

## 🐛 Error Handling Testing

### Scenario 18: Error Scenarios

**Objective**: Test system error handling

**Steps**:
1. Test with invalid file formats
2. Test with oversized files
3. Test with malformed API requests
4. Test database connection failures
5. Test network timeout scenarios

**Expected Results**:
- ✅ Graceful error handling
- ✅ User-friendly error messages
- ✅ System remains stable
- ✅ Errors properly logged

---

## 📝 Testing Checklist

### Pre-Testing Setup
- [ ] Database initialized and seeded
- [ ] Development server running
- [ ] Demo credentials accessible
- [ ] Browser console open (for OTP viewing)

### Patient Testing
- [ ] Registration flow complete
- [ ] Login methods working (OTP + Biometric)
- [ ] Medical timeline functional
- [ ] Encounter creation working
- [ ] Audit logs visible and accurate
- [ ] Profile management working

### Doctor Testing
- [ ] Emergency access request working
- [ ] Patient data accessible during session
- [ ] Session expiry functioning
- [ ] Multiple patient access working
- [ ] Authentication methods working

### Operator Testing
- [ ] Document upload functional
- [ ] Hospital boundaries enforced
- [ ] Encounter creation working
- [ ] Patient search working
- [ ] File format validation working

### Integration Testing
- [ ] Cross-role data flow working
- [ ] Multi-hospital scenarios working
- [ ] Audit trail comprehensive
- [ ] API endpoints responding correctly

### Security Testing
- [ ] Authentication security verified
- [ ] Data access controls working
- [ ] Session management secure
- [ ] Error handling appropriate

---

## 🔧 Troubleshooting Common Issues

### OTP Not Appearing
- Check browser console (development mode)
- Verify server logs for generation
- Ensure OTP hasn't expired (5 minutes)

### File Upload Failures
- Check file size (max 10MB)
- Verify file format (PDF, JPG, PNG)
- Ensure uploads directory exists and is writable

### Database Connection Issues
- Verify MySQL is running
- Check .env configuration
- Ensure database exists and is accessible

### Session Issues
- Clear browser cookies/localStorage
- Check JWT_SECRET in .env
- Verify session hasn't expired

### API Errors
- Check server logs for detailed errors
- Verify request format and headers
- Ensure proper authentication tokens

---

## 📈 Success Metrics

A successful test run should demonstrate:

- **100% Authentication Success**: All login methods work
- **Complete Audit Trail**: Every action logged and visible
- **Proper Access Control**: Role and hospital boundaries enforced
- **Emergency Access Functionality**: 30-minute sessions work correctly
- **Data Integrity**: Patient data remains consistent across operations
- **Security Compliance**: No unauthorized access possible
- **User Experience**: Intuitive flows for all user types

---

## 🎯 Next Steps After Testing

1. **Document Issues**: Record any bugs or unexpected behavior
2. **Performance Notes**: Note any slow operations
3. **User Feedback**: Gather feedback on user experience
4. **Security Review**: Ensure all security measures working
5. **Production Readiness**: Verify system ready for deployment