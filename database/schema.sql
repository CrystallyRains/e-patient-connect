-- E-Patient Connect Database Schema
-- MySQL Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS e_patient_connect;
USE e_patient_connect;

-- Users table (base table for all user types)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role ENUM('PATIENT', 'DOCTOR', 'OPERATOR') NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hospital_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Hospitals table
CREATE TABLE hospitals (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient profiles table
CREATE TABLE patient_profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    id_proof_type VARCHAR(50) NOT NULL,
    id_proof_number VARCHAR(100) UNIQUE NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    family_member_id VARCHAR(36) NULL,
    deleted_at TIMESTAMP NULL,
    biometric_fingerprint_ref VARCHAR(255) NULL,
    biometric_iris_ref VARCHAR(255) NULL,
    profile_photo_path VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_id_proof (id_proof_number),
    INDEX idx_deleted (deleted_at)
);

-- Doctor profiles table
CREATE TABLE doctor_profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    hospital_name VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Operator profiles table
CREATE TABLE operator_profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    hospital_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- OTP table for authentication
CREATE TABLE otps (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_purpose (user_id, purpose),
    INDEX idx_expires (expires_at)
);

-- Encounters table (medical timeline entries)
CREATE TABLE encounters (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_user_id VARCHAR(36) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    type VARCHAR(100) NOT NULL,
    reason_diagnosis TEXT NOT NULL,
    prescriptions_notes TEXT NOT NULL,
    allergies_snapshot TEXT NULL,
    chronic_snapshot TEXT NULL,
    blood_group VARCHAR(10) NULL,
    recent_surgery TEXT NULL,
    created_by_role VARCHAR(20) NOT NULL,
    created_by_user_id VARCHAR(36) NOT NULL,
    hospital_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_user_id) REFERENCES users(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    INDEX idx_patient_occurred (patient_user_id, occurred_at),
    INDEX idx_type (type),
    INDEX idx_created_by (created_by_user_id)
);

-- Documents table (file attachments)
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    encounter_id VARCHAR(36) NOT NULL,
    patient_user_id VARCHAR(36) NOT NULL,
    uploaded_by_user_id VARCHAR(36) NOT NULL,
    hospital_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id),
    FOREIGN KEY (patient_user_id) REFERENCES users(id),
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    INDEX idx_encounter (encounter_id),
    INDEX idx_patient (patient_user_id),
    INDEX idx_uploaded_by (uploaded_by_user_id)
);

-- Emergency sessions table (doctor access sessions)
CREATE TABLE emergency_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_user_id VARCHAR(36) NOT NULL,
    patient_user_id VARCHAR(36) NOT NULL,
    method ENUM('OTP', 'FINGERPRINT', 'IRIS') NOT NULL,
    reason TEXT NOT NULL,
    hospital_name VARCHAR(255) NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status ENUM('ACTIVE', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE',
    FOREIGN KEY (doctor_user_id) REFERENCES users(id),
    FOREIGN KEY (patient_user_id) REFERENCES users(id),
    INDEX idx_doctor_active (doctor_user_id, status),
    INDEX idx_patient_active (patient_user_id, status),
    INDEX idx_expires (expires_at)
);

-- Audit logs table (comprehensive logging)
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    actor_user_id VARCHAR(36) NULL,
    actor_role VARCHAR(20) NOT NULL,
    patient_user_id VARCHAR(36) NULL,
    action_type VARCHAR(100) NOT NULL,
    details_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id),
    FOREIGN KEY (patient_user_id) REFERENCES users(id),
    INDEX idx_actor (actor_user_id),
    INDEX idx_patient (patient_user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
);

-- Add foreign key constraints
ALTER TABLE users ADD FOREIGN KEY (hospital_id) REFERENCES hospitals(id);