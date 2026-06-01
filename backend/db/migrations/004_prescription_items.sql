BEGIN;

CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  medication VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  duration_days INT NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dispensed')),
  dispensed_at TIMESTAMPTZ,
  dispensed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (prescription_id, position)
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON prescription_items(prescription_id);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES prescription_items(id);

INSERT INTO prescription_items
  (prescription_id, position, medication, dosage, duration_days, notes, status)
SELECT
  p.id,
  0,
  p.medication,
  p.dosage,
  GREATEST(1, ROUND(EXTRACT(EPOCH FROM (p.valid_until - p.created_at)) / 86400))::int,
  p.instructions,
  CASE WHEN p.status = 'dispensed' THEN 'dispensed' ELSE 'active' END
FROM prescriptions p
WHERE p.medication IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM prescription_items i WHERE i.prescription_id = p.id);

ALTER TABLE prescriptions ALTER COLUMN medication DROP NOT NULL;
ALTER TABLE prescriptions ALTER COLUMN dosage DROP NOT NULL;

COMMIT;
