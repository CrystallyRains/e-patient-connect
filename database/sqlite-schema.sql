-- E-Patient Connect SQLite Database Schema

-- Users table (base table for all user types)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    role TEXT CHECK (role IN ('PATIENT', 'DOCTOR', 'OPERATOR')) NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hospital_id TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals table
CREATE TABLE hospitals (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Patient profiles table
CREATE TABLE patient_profiles (
    user_id TEXT PRIMARY KEY,
    id_proof_type TEXT NOT NULL,
    id_proof_number TEXT UNIQUE NOT NULL,
    emergency_contact TEXT NOT NULL,
    family_member_id TEXT NULL,
    deleted_at DATETIME NULL,
    biometric_fingerprint_ref TEXT NULL,
    biometric_iris_ref TEXT NULL,
    profile_photo_path TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Doctor profiles table
CREATE TABLE doctor_profiles (
    user_id TEXT PRIMARY KEY,
    hospital_name TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Operator profiles table
CREATE TABLE operator_profiles (
    user_id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OTP table for authentication
CREATE TABLE otps (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Encounters table (medical timeline entries)
CREATE TABLE encounters (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    patient_user_id TEXT NOT NULL,
    occurred_at DATETIME NOT NULL,
    type TEXT NOT NULL,
    reason_diagnosis TEXT NOT NULL,
    prescriptions_notes TEXT NOT NULL,
    allergies_snapshot TEXT NULL,
    chronic_snapshot TEXT NULL,
    blood_group TEXT NULL,
    recent_surgery TEXT NULL,
    created_by_role TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    hospital_id TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (file attachments)
CREATE TABLE documents (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    encounter_id TEXT NOT NULL,
    patient_user_id TEXT NOT NULL,
    uploaded_by_user_id TEXT NOT NULL,
    hospital_id TEXT NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emergency sessions table (doctor access sessions)
CREATE TABLE emergency_sessions (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    doctor_user_id TEXT NOT NULL,
    patient_user_id TEXT NOT NULL,
    method TEXT CHECK (method IN ('OTP', 'FINGERPRINT', 'IRIS')) NOT NULL,
    reason TEXT NOT NULL,
    hospital_name TEXT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    status TEXT CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')) DEFAULT 'ACTIVE'
);

-- Audit logs table (comprehensive logging)
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    actor_user_id TEXT NULL,
    actor_role TEXT NOT NULL,
    patient_user_id TEXT NULL,
    action_type TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_patient_profiles_id_proof ON patient_profiles(id_proof_number);
CREATE INDEX idx_patient_profiles_deleted ON patient_profiles(deleted_at);
CREATE INDEX idx_otps_user_purpose ON otps(user_id, purpose);
CREATE INDEX idx_otps_expires ON otps(expires_at);
CREATE INDEX idx_encounters_patient_occurred ON encounters(patient_user_id, occurred_at);
CREATE INDEX idx_encounters_type ON encounters(type);
CREATE INDEX idx_encounters_created_by ON encounters(created_by_user_id);
CREATE INDEX idx_documents_encounter ON documents(encounter_id);
CREATE INDEX idx_documents_patient ON documents(patient_user_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by_user_id);
CREATE INDEX idx_emergency_sessions_doctor_active ON emergency_sessions(doctor_user_id, status);
CREATE INDEX idx_emergency_sessions_patient_active ON emergency_sessions(patient_user_id, status);
CREATE INDEX idx_emergency_sessions_expires ON emergency_sessions(expires_at);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);