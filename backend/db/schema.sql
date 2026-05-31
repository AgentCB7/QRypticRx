-- QRypticRx Database Schema
-- Run this against your Supabase PostgreSQL instance

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'pharmacist')),
  public_key TEXT,
  pharmacy_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES users(id),
  patient_name VARCHAR(255) NOT NULL,
  patient_ic VARCHAR(100) NOT NULL,
  medication VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  instructions TEXT,
  valid_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dispensed', 'expired')),
  hash VARCHAR(64) NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  pharmacist_id UUID NOT NULL REFERENCES users(id),
  pharmacy_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_prescription_id ON audit_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_pharmacist_id ON audit_logs(pharmacist_id);
