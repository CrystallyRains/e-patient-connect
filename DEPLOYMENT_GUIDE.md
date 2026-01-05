# E-Patient Connect Deployment Guide

This guide covers deployment of the E-Patient Connect system to production environments.

## 🚀 Production Deployment

### Prerequisites

- **Node.js**: 18+ LTS version
- **MySQL**: 8.0+ with InnoDB storage engine
- **SSL Certificate**: For HTTPS encryption
- **Domain Name**: For production access
- **Server**: Minimum 2GB RAM, 20GB storage

### Environment Setup

1. **Server Preparation**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install MySQL
   sudo apt install mysql-server -y
   sudo mysql_secure_installation
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Database Setup**
   ```bash
   # Create production database
   mysql -u root -p
   CREATE DATABASE e_patient_connect_prod;
   CREATE USER 'epatient'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON e_patient_connect_prod.* TO 'epatient'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Application Deployment**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd e-patient-connect
   
   # Install dependencies
   npm ci --only=production
   
   # Build application
   npm run build
   ```

4. **Environment Configuration**
   ```bash
   # Create production .env file
   cp .env.example .env.production
   ```

   **Production .env.production**:
   ```env
   NODE_ENV=production
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=epatient
   DB_PASSWORD=secure_password
   DB_NAME=e_patient_connect_prod
   
   # Security
   JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
   
   # File Storage
   UPLOAD_DIR=/var/www/e-patient-connect/uploads
   
   # Server Configuration
   PORT=3000
   HOST=0.0.0.0
   
   # SSL Configuration (if using HTTPS)
   HTTPS_ENABLED=true
   SSL_CERT_PATH=/path/to/ssl/cert.pem
   SSL_KEY_PATH=/path/to/ssl/private.key
   ```

5. **Database Initialization**
   ```bash
   # Initialize production database
   NODE_ENV=production npm run db:init
   
   # Do NOT run seed script in production
   # npm run db:seed  # Only for development
   ```

6. **File Permissions**
   ```bash
   # Create uploads directory
   sudo mkdir -p /var/www/e-patient-connect/uploads
   sudo chown -R www-data:www-data /var/www/e-patient-connect/uploads
   sudo chmod -R 755 /var/www/e-patient-connect/uploads
   ```

7. **Process Management**
   ```bash
   # Start with PM2
   pm2 start npm --name "e-patient-connect" -- start
   pm2 save
   pm2 startup
   ```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # File upload size limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static file serving
    location /uploads/ {
        alias /var/www/e-patient-connect/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔒 Security Configuration

### 1. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER 'epatient_readonly'@'localhost' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON e_patient_connect_prod.* TO 'epatient_readonly'@'localhost';

-- Enable binary logging for backup
SET GLOBAL log_bin = ON;
SET GLOBAL binlog_format = 'ROW';
```

### 2. Application Security

**Security Headers** (already in Nginx config):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

**Rate Limiting**:
```nginx
# Add to Nginx config
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=otp:10m rate=5r/m;
}

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
    
    location /api/auth/otp/ {
        limit_req zone=otp burst=3 nodelay;
    }
}
```

### 3. File Security

```bash
# Secure uploads directory
sudo chown -R www-data:www-data /var/www/e-patient-connect/uploads
sudo chmod -R 644 /var/www/e-patient-connect/uploads
sudo find /var/www/e-patient-connect/uploads -type d -exec chmod 755 {} \;

# Prevent execution of uploaded files
echo "Options -ExecCGI" > /var/www/e-patient-connect/uploads/.htaccess
```

---

## 📊 Monitoring and Logging

### 1. Application Monitoring

**PM2 Monitoring**:
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs e-patient-connect

# Restart application
pm2 restart e-patient-connect
```

**Health Check Endpoint**:
```bash
# Monitor application health
curl https://your-domain.com/api/health
```

### 2. Database Monitoring

```sql
-- Monitor database performance
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'e_patient_connect_prod'
ORDER BY (data_length + index_length) DESC;
```

### 3. Log Management

**Application Logs**:
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/e-patient-connect

/var/log/e-patient-connect/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload e-patient-connect
    endscript
}
```

**Nginx Logs**:
```nginx
# Add to Nginx config
access_log /var/log/nginx/e-patient-connect.access.log;
error_log /var/log/nginx/e-patient-connect.error.log;
```

---

## 🔄 Backup and Recovery

### 1. Database Backup

**Automated Backup Script**:
```bash
#!/bin/bash
# /usr/local/bin/backup-epatient-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/e-patient-connect"
DB_NAME="e_patient_connect_prod"
DB_USER="epatient"
DB_PASS="secure_password"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: db_backup_$DATE.sql.gz"
```

**Cron Job**:
```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-epatient-db.sh
```

### 2. File Backup

```bash
#!/bin/bash
# /usr/local/bin/backup-epatient-files.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/e-patient-connect"
UPLOAD_DIR="/var/www/e-patient-connect/uploads"

# Create backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz -C $UPLOAD_DIR .

# Remove old backups
find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +30 -delete

echo "Files backup completed: files_backup_$DATE.tar.gz"
```

### 3. Recovery Procedures

**Database Recovery**:
```bash
# Stop application
pm2 stop e-patient-connect

# Restore database
gunzip -c /var/backups/e-patient-connect/db_backup_YYYYMMDD_HHMMSS.sql.gz | mysql -u epatient -p e_patient_connect_prod

# Start application
pm2 start e-patient-connect
```

**File Recovery**:
```bash
# Stop application
pm2 stop e-patient-connect

# Restore files
cd /var/www/e-patient-connect/uploads
tar -xzf /var/backups/e-patient-connect/files_backup_YYYYMMDD_HHMMSS.tar.gz

# Fix permissions
sudo chown -R www-data:www-data /var/www/e-patient-connect/uploads

# Start application
pm2 start e-patient-connect
```

---

## 🔧 Maintenance

### 1. Regular Updates

**System Updates**:
```bash
# Monthly system updates
sudo apt update && sudo apt upgrade -y
sudo reboot
```

**Application Updates**:
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Restart application
pm2 restart e-patient-connect
```

### 2. Database Maintenance

```sql
-- Monthly optimization
OPTIMIZE TABLE users, patient_profiles, encounters, documents, audit_logs;

-- Check for corruption
CHECK TABLE users, patient_profiles, encounters, documents, audit_logs;

-- Update statistics
ANALYZE TABLE users, patient_profiles, encounters, documents, audit_logs;
```

### 3. Log Cleanup

```bash
# Clean old logs
sudo find /var/log -name "*.log" -mtime +90 -delete
sudo find /var/log -name "*.gz" -mtime +90 -delete

# Clean PM2 logs
pm2 flush
```

---

## 📈 Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_encounters_patient_date ON encounters(patient_user_id, occurred_at);
CREATE INDEX idx_audit_logs_patient_date ON audit_logs(patient_user_id, created_at);
CREATE INDEX idx_documents_encounter ON documents(encounter_id);
CREATE INDEX idx_sessions_user ON sessions(user_id, expires_at);

-- Configure MySQL for production
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL query_cache_size = 268435456; -- 256MB
SET GLOBAL max_connections = 200;
```

### 2. Application Optimization

**PM2 Cluster Mode**:
```bash
# Use cluster mode for better performance
pm2 start npm --name "e-patient-connect" -i max -- start
```

**Nginx Caching**:
```nginx
# Add to Nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /api/health {
    expires 1m;
    add_header Cache-Control "public";
}
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Application Won't Start**
```bash
# Check logs
pm2 logs e-patient-connect

# Check port availability
sudo netstat -tlnp | grep :3000

# Check environment variables
pm2 env e-patient-connect
```

**2. Database Connection Issues**
```bash
# Test database connection
mysql -u epatient -p e_patient_connect_prod

# Check MySQL status
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

**3. File Upload Issues**
```bash
# Check upload directory permissions
ls -la /var/www/e-patient-connect/uploads

# Check disk space
df -h

# Check Nginx error logs
sudo tail -f /var/log/nginx/e-patient-connect.error.log
```

**4. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect your-domain.com:443
```

### Emergency Procedures

**1. Application Crash**
```bash
# Restart application
pm2 restart e-patient-connect

# If restart fails, stop and start
pm2 stop e-patient-connect
pm2 start e-patient-connect
```

**2. Database Issues**
```bash
# Restart MySQL
sudo systemctl restart mysql

# Check for corruption
mysqlcheck -u epatient -p --all-databases --check
```

**3. High Load**
```bash
# Check system resources
top
htop
iotop

# Scale application
pm2 scale e-patient-connect +2
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Server provisioned and secured
- [ ] MySQL installed and configured
- [ ] SSL certificates obtained
- [ ] Domain name configured
- [ ] Backup procedures tested

### Deployment
- [ ] Application code deployed
- [ ] Dependencies installed
- [ ] Database initialized
- [ ] Environment variables configured
- [ ] File permissions set correctly
- [ ] Nginx configured
- [ ] PM2 process started

### Post-Deployment
- [ ] Health check endpoint responding
- [ ] All user flows tested
- [ ] SSL certificate working
- [ ] Monitoring configured
- [ ] Backup jobs scheduled
- [ ] Log rotation configured

### Security Verification
- [ ] No development credentials in production
- [ ] JWT secret is secure and unique
- [ ] Database passwords are strong
- [ ] File upload restrictions working
- [ ] Rate limiting configured
- [ ] Security headers present

---

## 🔮 Scaling Considerations

### Horizontal Scaling

**Load Balancer Configuration**:
```nginx
upstream e_patient_connect {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    location / {
        proxy_pass http://e_patient_connect;
    }
}
```

**Database Scaling**:
- Read replicas for reporting queries
- Connection pooling
- Query optimization
- Partitioning for large tables

### Vertical Scaling

**Server Resources**:
- CPU: 4+ cores for high load
- RAM: 8GB+ for database caching
- Storage: SSD for better I/O performance
- Network: Adequate bandwidth for file uploads

This deployment guide ensures a secure, scalable, and maintainable production deployment of the E-Patient Connect system.