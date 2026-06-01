const { buildPayload } = require('../lib/payload');

test('valid_until is normalized to ISO regardless of input form', () => {
  const base = {
    patient_name: 'A', patient_ic: '900101-01-1234', medication: 'X',
    dosage: '1x', instructions: '', doctor_id: 'doc-1',
  };
  const fromString = buildPayload({ ...base, valid_until: '2027-01-01T00:00:00.000Z' });
  const fromDate = buildPayload({ ...base, valid_until: new Date('2027-01-01T00:00:00.000Z') });
  expect(fromString).toBe(fromDate);
  expect(JSON.parse(fromString).valid_until).toBe('2027-01-01T00:00:00.000Z');
});

test('payload key order is stable', () => {
  const p = buildPayload({
    patient_name: 'A', patient_ic: 'B', medication: 'C', dosage: 'D',
    instructions: 'E', valid_until: '2027-01-01T00:00:00.000Z', doctor_id: 'F',
  });
  expect(Object.keys(JSON.parse(p))).toEqual([
    'patient_name', 'patient_ic', 'medication', 'dosage', 'instructions', 'valid_until', 'doctor_id',
  ]);
});
