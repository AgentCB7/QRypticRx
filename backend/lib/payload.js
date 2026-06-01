function buildPayload(fields) {
  return JSON.stringify({
    patient_name: fields.patient_name,
    patient_ic: fields.patient_ic,
    medicines: (fields.medicines || []).map(m => ({
      medication: m.medication,
      dosage: m.dosage,
      duration_days: m.duration_days,
      notes: m.notes ?? '',
    })),
    valid_until: new Date(fields.valid_until).toISOString(),
    doctor_id: fields.doctor_id,
  });
}

module.exports = { buildPayload };
