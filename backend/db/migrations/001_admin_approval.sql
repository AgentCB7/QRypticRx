BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('doctor', 'pharmacist', 'admin'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliation VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS applicant_note TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE users SET status = 'approved' WHERE status = 'pending';

ALTER TABLE audit_logs ALTER COLUMN prescription_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMIT;
