function buildPayload(fields) {
  return JSON.stringify({
    patient_name: fields.patient_name,
    patient_ic: fields.patient_ic,
    medication: fields.medication,
    dosage: fields.dosage,
    instructions: fields.instructions,
    valid_until: new Date(fields.valid_until).toISOString(),
    doctor_id: fields.doctor_id,
  });
}

module.exports = { buildPayload };
