# E-Patient Connect Troubleshooting Guide

This guide helps resolve common issues encountered while developing, testing, or deploying the E-Patient Connect system.

## 🚨 Quick Diagnostics

### System Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Check system status
curl http://localhost:3000/api/status

# Check database connection
npm run db:init --dry-run
```

### Log Locations

- **Application Logs**: Browser console (development) or PM2 logs (production)
- **Database Logs**: MySQL error log (`/var/log/mysql/error.log`)
- **Web Server Logs**: Nginx access/error logs
- **System Logs**: `/var/log/syslog`

---

## 🔧 Development Issues

### Issue: Database Connection Failed

**Symptoms**:
- Application won't start
- Error: "ENOENT" or "Database file not found"
- Health check returns database disconnected

**Solutions**:

1. **Check SQLite Database File**
   ```bash
   # Check if database file exists
   ls -la database/e_patient_connect.db
   
   # Check database directory permissions
   ls -la database/
   ```

2. **Verify Database Initialization**
   ```bash
   # Reinitialize database
   npm run db:init
   
   # Check if tables were created
   sqlite3 database/e_patient_connect.db ".tables"
   ```

3. **Check Database Permissions**
   ```bash
   # Fix permissions if needed
   chmod 644 database/e_patient_connect.db
   chmod 755 database/
   ```

4. **Recreate Database**
   ```bash
   # Remove and recreate database (CAUTION: This deletes all data)
   rm database/e_patient_connect.db*
   npm run db:init
   npm run db:seed
   ```

### Issue: OTP Not Displaying in Development

**Symptoms**:
- OTP generation succeeds but OTP not visible
- Console shows "OTP sent successfully" but no OTP value

**Solutions**:

1. **Check Development Mode**
   ```bash
   # Verify NODE_ENV
   echo $NODE_ENV
   
   # Should be 'development' for OTP display
   export NODE_ENV=development
   ```

2. **Check Browser Console**
   - Open browser developer tools (F12)
   - Look in Console tab for OTP output
   - Check for JavaScript errors blocking output

3. **Check OTP Service**
   ```javascript
   // In browser console, check if development mode is active
   console.log(process.env.NODE_ENV)
   ```

4. **Manual OTP Testing**
   ```bash
   # Test OTP generation directly
   curl -X POST http://localhost:3000/api/auth/otp/generate \
     -H "Content-Type: application/json" \
     -d '{"identifier":"+1234567890","purpose":"LOGIN"}'
   ```

### Issue: File Upload Failures

**Symptoms**:
- "File upload failed" error
- Files not appearing in uploads directory
- Server returns 500 error on upload

**Solutions**:

1. **Check Upload Directory**
   ```bash
   # Verify directory exists
   ls -la uploads/
   
   # Create if missing
   mkdir -p uploads
   chmod 755 uploads
   ```

2. **Check File Permissions**
   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER uploads/
   chmod -R 755 uploads/
   ```

3. **Check File Size Limits**
   ```javascript
   // Check if file exceeds 10MB limit
   console.log('File size:', file.size / 1024 / 1024, 'MB')
   ```

4. **Check File Type**
   ```javascript
   // Verify file type is allowed
   const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
   console.log('File type:', file.type)
   ```

### Issue: Build Failures

**Symptoms**:
- `npm run build` fails
- TypeScript compilation errors
- Missing dependencies

**Solutions**:

1. **Clear Cache and Reinstall**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check TypeScript Errors**
   ```bash
   # Run TypeScript check
   npx tsc --noEmit
   
   # Fix any type errors shown
   ```

3. **Check Next.js Version Compatibility**
   ```bash
   # Check versions
   npm list next react react-dom
   
   # Update if needed
   npm update next react react-dom
   ```

---

## 🔐 Authentication Issues

### Issue: Login Fails with Valid Credentials

**Symptoms**:
- Correct mobile/email and OTP but login fails
- "Authentication failed" error
- User exists in database

**Solutions**:

1. **Check OTP Expiry**
   ```sql
   -- Check active OTPs
   SELECT * FROM otps WHERE user_id = 'USER_ID' ORDER BY created_at DESC;
   
   -- Check if OTP expired
   SELECT *, (expires_at < NOW()) as expired FROM otps WHERE user_id = 'USER_ID';
   ```

2. **Check OTP Attempts**
   ```sql
   -- Check attempt count
   SELECT attempts FROM otps WHERE user_id = 'USER_ID' AND purpose = 'LOGIN';
   
   -- Reset attempts if needed (development only)
   UPDATE otps SET attempts = 0 WHERE user_id = 'USER_ID';
   ```

3. **Check User Status**
   ```bash
   # Verify user exists and is active using SQLite
   sqlite3 database/e_patient_connect.db "SELECT * FROM users WHERE mobile = '+1234567890' OR email = 'user@example.com';"
   
   # Check if user is soft-deleted
   sqlite3 database/e_patient_connect.db "SELECT * FROM users WHERE (mobile = '+1234567890' OR email = 'user@example.com') AND deleted_at IS NULL;"
   ```

4. **Generate Fresh OTP**
   ```bash
   # Clear old OTPs and generate new one
   curl -X POST http://localhost:3000/api/auth/otp/generate \
     -H "Content-Type: application/json" \
     -d '{"identifier":"+1234567890","purpose":"LOGIN"}'
   ```

### Issue: Biometric Authentication Fails

**Symptoms**:
- "Biometric verification failed" error
- No biometric reference found
- Placeholder authentication not working

**Solutions**:

1. **Check Biometric Registration**
   ```sql
   -- Check if biometric references exist
   SELECT biometric_fingerprint_ref, biometric_iris_ref 
   FROM patient_profiles 
   WHERE user_id = 'USER_ID';
   ```

2. **Register Biometric Placeholders**
   ```bash
   # Register biometric data for demo user
   curl -X POST http://localhost:3000/api/user/biometrics \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"fingerprintData":"placeholder","irisData":"placeholder"}'
   ```

3. **Check Biometric Service**
   ```javascript
   // In development, biometric success rate is 95%
   // Try multiple times if it fails
   ```

### Issue: Emergency Access Session Expired

**Symptoms**:
- "Session expired" error during emergency access
- Cannot access patient data after 30 minutes
- Emergency session not found

**Solutions**:

1. **Check Session Expiry**
   ```sql
   -- Check active emergency sessions
   SELECT * FROM emergency_sessions WHERE doctor_user_id = 'DOCTOR_ID' AND expires_at > NOW();
   ```

2. **Request New Emergency Access**
   ```bash
   # Request fresh emergency access
   curl -X POST http://localhost:3000/api/emergency/request \
     -H "Authorization: Bearer DOCTOR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "patientIdentifier": "+1234567890",
       "reason": "Emergency medical situation",
       "authMethod": "OTP",
       "authData": "123456"
     }'
   ```

3. **Extend Session (Development Only)**
   ```bash
   # Extend emergency session for testing (development only)
   sqlite3 database/e_patient_connect.db "UPDATE emergency_sessions SET expires_at = datetime('now', '+30 minutes') WHERE session_id = 'SESSION_ID';"
   ```

---

## 🏥 Hospital Operator Issues

### Issue: Cannot Access Patient Data

**Symptoms**:
- "Access denied" error
- Hospital boundary violation
- Cannot see patients from other hospitals

**Solutions**:

1. **Check Hospital Association**
   ```sql
   -- Check operator's hospital
   SELECT u.name, u.hospital_id, h.name as hospital_name
   FROM users u
   JOIN hospitals h ON u.hospital_id = h.id
   WHERE u.id = 'OPERATOR_ID';
   ```

2. **Check Patient Hospital Association**
   ```sql
   -- Check which hospital the patient's encounters are from
   SELECT e.*, h.name as hospital_name
   FROM encounters e
   JOIN hospitals h ON e.hospital_id = h.id
   WHERE e.patient_user_id = 'PATIENT_ID';
   ```

3. **Verify Hospital Boundaries**
   ```sql
   -- Check if operator can access specific patient
   SELECT COUNT(*) as can_access
   FROM encounters e
   JOIN users u ON u.id = 'OPERATOR_ID'
   WHERE e.patient_user_id = 'PATIENT_ID' 
   AND e.hospital_id = u.hospital_id;
   ```

### Issue: Document Upload Restrictions

**Symptoms**:
- Cannot upload documents for certain patients
- "Hospital boundary violation" error
- Upload succeeds but document not visible

**Solutions**:

1. **Check Patient-Hospital Relationship**
   ```sql
   -- Verify patient has encounters at operator's hospital
   SELECT e.id, e.type, e.occurred_at, h.name as hospital
   FROM encounters e
   JOIN hospitals h ON e.hospital_id = h.id
   WHERE e.patient_user_id = 'PATIENT_ID'
   AND e.hospital_id = (SELECT hospital_id FROM users WHERE id = 'OPERATOR_ID');
   ```

2. **Create Hospital Encounter First**
   ```bash
   # Create encounter at operator's hospital before uploading documents
   curl -X POST http://localhost:3000/api/encounters \
     -H "Authorization: Bearer OPERATOR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "patientUserId": "PATIENT_ID",
       "occurredAt": "2024-01-15T10:00:00Z",
       "type": "Document Upload",
       "reasonDiagnosis": "Medical records from hospital visit"
     }'
   ```

---

## 📊 Data and Audit Issues

### Issue: Missing Audit Logs

**Symptoms**:
- Patient cannot see access history
- Audit logs appear incomplete
- Missing entries for known actions

**Solutions**:

1. **Check Audit Log Service**
   ```sql
   -- Verify audit logs exist
   SELECT * FROM audit_logs WHERE patient_user_id = 'PATIENT_ID' ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check Audit Log Permissions**
   ```sql
   -- Verify patient can access their own logs
   SELECT COUNT(*) FROM audit_logs WHERE patient_user_id = 'PATIENT_ID';
   ```

3. **Manually Create Audit Entry (Development)**
   ```sql
   -- Create test audit entry
   INSERT INTO audit_logs (actor_user_id, actor_role, patient_user_id, action_type, details_json)
   VALUES ('ACTOR_ID', 'PATIENT', 'PATIENT_ID', 'TEST_ACTION', '{"test": true}');
   ```

### Issue: Timeline Not Displaying Correctly

**Symptoms**:
- Encounters not in chronological order
- Missing encounters in timeline
- Duplicate entries

**Solutions**:

1. **Check Encounter Dates**
   ```sql
   -- Verify encounter dates and ordering
   SELECT id, type, occurred_at, created_at
   FROM encounters 
   WHERE patient_user_id = 'PATIENT_ID'
   ORDER BY occurred_at DESC;
   ```

2. **Check for Soft-Deleted Encounters**
   ```sql
   -- Check if encounters are soft-deleted
   SELECT id, type, occurred_at, deleted_at
   FROM encounters 
   WHERE patient_user_id = 'PATIENT_ID'
   AND deleted_at IS NULL
   ORDER BY occurred_at DESC;
   ```

3. **Refresh Timeline Data**
   ```bash
   # Clear cache and reload timeline
   # In browser console:
   localStorage.clear()
   location.reload()
   ```

---

## 🌐 Network and API Issues

### Issue: API Endpoints Not Responding

**Symptoms**:
- 404 errors for API calls
- "Cannot GET /api/..." errors
- Network request failures

**Solutions**:

1. **Check Server Status**
   ```bash
   # Verify server is running
   curl http://localhost:3000/api/health
   
   # Check process status
   ps aux | grep node
   ```

2. **Check Route Configuration**
   ```bash
   # Verify API routes exist
   ls -la src/app/api/
   
   # Check specific route file
   ls -la src/app/api/auth/login/route.ts
   ```

3. **Check Network Configuration**
   ```bash
   # Check if port is in use
   netstat -tlnp | grep :3000
   
   # Check firewall rules
   sudo ufw status
   ```

### Issue: CORS Errors

**Symptoms**:
- "CORS policy" errors in browser
- Cross-origin request blocked
- API calls fail from frontend

**Solutions**:

1. **Check Next.js Configuration**
   ```javascript
   // In next.config.js
   module.exports = {
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             { key: 'Access-Control-Allow-Origin', value: '*' },
             { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
             { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
           ],
         },
       ]
     },
   }
   ```

2. **Check Request Headers**
   ```javascript
   // Ensure proper headers in API calls
   fetch('/api/endpoint', {
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + token
     }
   })
   ```

---

## 🔍 Performance Issues

### Issue: Slow Database Queries

**Symptoms**:
- Long loading times
- Timeout errors
- High CPU usage

**Solutions**:

1. **Check Query Performance**
   ```bash
   # Check SQLite query performance
   sqlite3 database/e_patient_connect.db ".timer on"
   sqlite3 database/e_patient_connect.db "SELECT * FROM encounters WHERE patient_user_id = 'USER_ID' ORDER BY occurred_at DESC;"
   ```

2. **Add Database Indexes**
   ```bash
   # Add indexes for common queries
   sqlite3 database/e_patient_connect.db "CREATE INDEX IF NOT EXISTS idx_encounters_patient_date ON encounters(patient_user_id, occurred_at);"
   sqlite3 database/e_patient_connect.db "CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON audit_logs(patient_user_id, created_at);"
   sqlite3 database/e_patient_connect.db "CREATE INDEX IF NOT EXISTS idx_documents_encounter ON documents(encounter_id);"
   ```

3. **Optimize Database Configuration**
   ```bash
   # Enable WAL mode for better concurrent access
   sqlite3 database/e_patient_connect.db "PRAGMA journal_mode=WAL;"
   
   # Optimize SQLite settings
   sqlite3 database/e_patient_connect.db "PRAGMA synchronous=NORMAL;"
   sqlite3 database/e_patient_connect.db "PRAGMA cache_size=10000;"
   ```

### Issue: High Memory Usage

**Symptoms**:
- Server running out of memory
- Application crashes with OOM errors
- Slow response times

**Solutions**:

1. **Check Memory Usage**
   ```bash
   # Check system memory
   free -h
   
   # Check process memory
   ps aux --sort=-%mem | head -10
   
   # Check Node.js memory
   node --max-old-space-size=4096 server.js
   ```

2. **Optimize Application**
   ```bash
   # Use PM2 cluster mode
   pm2 start npm --name "e-patient-connect" -i max -- start
   
   # Set memory limits
   pm2 start npm --name "e-patient-connect" --max-memory-restart 1G -- start
   ```

---

## 🛠️ Development Environment Issues

### Issue: Hot Reload Not Working

**Symptoms**:
- Changes not reflected in browser
- Need to manually refresh
- Development server not detecting changes

**Solutions**:

1. **Check File Watchers**
   ```bash
   # Increase file watcher limit
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Restart Development Server**
   ```bash
   # Stop and restart dev server
   npm run dev
   ```

3. **Clear Next.js Cache**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run dev
   ```

### Issue: Environment Variables Not Loading

**Symptoms**:
- Undefined environment variables
- Default values being used
- Configuration not applied

**Solutions**:

1. **Check .env File**
   ```bash
   # Verify .env file exists and has correct format
   cat .env
   
   # Check for syntax errors (no spaces around =)
   grep -n "=" .env
   ```

2. **Restart Application**
   ```bash
   # Environment variables are loaded at startup
   npm run dev
   ```

3. **Check Variable Names**
   ```javascript
   // In Next.js, client-side variables need NEXT_PUBLIC_ prefix
   console.log(process.env.NEXT_PUBLIC_API_URL)
   console.log(process.env.JWT_SECRET) // Server-side only
   ```

---

## 📋 Diagnostic Commands

### Quick Health Check
```bash
#!/bin/bash
echo "=== E-Patient Connect Health Check ==="

echo "1. Checking application..."
curl -s http://localhost:3000/api/health | jq .

echo "2. Checking database..."
sqlite3 database/e_patient_connect.db "SELECT 'Database OK' as status;"

echo "3. Checking file permissions..."
ls -la uploads/

echo "4. Checking processes..."
ps aux | grep -E "(node|mysql)"

echo "5. Checking disk space..."
df -h

echo "6. Checking memory..."
free -h

echo "Health check complete!"
```

### Log Analysis
```bash
#!/bin/bash
echo "=== Recent Errors ==="

echo "Application errors:"
pm2 logs e-patient-connect --lines 50 | grep -i error

echo "Database errors:"
tail -50 database/sqlite.log 2>/dev/null || echo "No SQLite log file found"

echo "System errors:"
sudo tail -50 /var/log/syslog | grep -i error
```

### Performance Check
```bash
#!/bin/bash
echo "=== Performance Metrics ==="

echo "CPU usage:"
top -bn1 | grep "Cpu(s)"

echo "Memory usage:"
free -h

echo "Disk I/O:"
iostat -x 1 1

echo "Network connections:"
netstat -an | grep :3000
```

---

## 🆘 Emergency Procedures

### Application Down
1. Check if process is running: `pm2 list`
2. Restart application: `pm2 restart e-patient-connect`
3. Check logs: `pm2 logs e-patient-connect`
4. If database issue, restart MySQL: `sudo systemctl restart mysql`

### Database Corruption
1. Stop application: `pm2 stop e-patient-connect`
2. Check database integrity: `sqlite3 database/e_patient_connect.db "PRAGMA integrity_check;"`
3. Repair if needed: `sqlite3 database/e_patient_connect.db "PRAGMA optimize;"`
4. Restore from backup if necessary
5. Restart application: `pm2 start e-patient-connect`

### Security Breach
1. Immediately change JWT secret in .env
2. Restart application to invalidate all sessions
3. Check audit logs for suspicious activity
4. Review and update security measures
5. Notify users if necessary

---

## 📞 Getting Help

### Log Collection
When reporting issues, collect these logs:
```bash
# Application logs
pm2 logs e-patient-connect --lines 100 > app-logs.txt

# Database logs
tail -50 database/sqlite.log 2>/dev/null || echo "No SQLite log available" > db-logs.txt

# System logs
sudo tail -100 /var/log/syslog > system-logs.txt

# Configuration
cat .env > config.txt (remove sensitive data)
```

### System Information
```bash
# System info
uname -a
node --version
npm --version
sqlite3 --version
```

This troubleshooting guide covers the most common issues. For complex problems, enable debug logging and collect detailed system information before seeking help.