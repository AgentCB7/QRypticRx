const { buildPayload } = require('../lib/payload');

test('valid_until is normalized to ISO regardless of input form', () => {
  const base = {
    patient_name: 'A', patient_ic: '900101-01-1234',
    medicines: [{ medication: 'X', dosage: '1x', duration_days: 7, notes: '' }],
    doctor_id: 'doc-1',
  };
  const fromString = buildPayload({ ...base, valid_until: '2027-01-01T00:00:00.000Z' });
  const fromDate = buildPayload({ ...base, valid_until: new Date('2027-01-01T00:00:00.000Z') });
  expect(fromString).toBe(fromDate);
  expect(JSON.parse(fromString).valid_until).toBe('2027-01-01T00:00:00.000Z');
});

test('top-level payload key order is stable', () => {
  const p = buildPayload({
    patient_name: 'A', patient_ic: 'B',
    medicines: [{ medication: 'C', dosage: 'D', duration_days: 1, notes: 'E' }],
    valid_until: '2027-01-01T00:00:00.000Z', doctor_id: 'F',
  });
  expect(Object.keys(JSON.parse(p))).toEqual([
    'patient_name', 'patient_ic', 'medicines', 'valid_until', 'doctor_id',
  ]);
});

test('each medicine has a fixed key order', () => {
  const p = buildPayload({
    patient_name: 'A', patient_ic: 'B',
    medicines: [{ medication: 'C', dosage: 'D', duration_days: 1, notes: 'E' }],
    valid_until: '2027-01-01T00:00:00.000Z', doctor_id: 'F',
  });
  expect(Object.keys(JSON.parse(p).medicines[0])).toEqual([
    'medication', 'dosage', 'duration_days', 'notes',
  ]);
});

test('medicines preserve order and notes default to empty string', () => {
  const p = buildPayload({
    patient_name: 'A', patient_ic: 'B',
    medicines: [
      { medication: 'First', dosage: '1+0+1', duration_days: 7 },
      { medication: 'Second', dosage: '0+0+1', duration_days: 3, notes: 'after food' },
    ],
    valid_until: '2027-01-01T00:00:00.000Z', doctor_id: 'F',
  });
  const meds = JSON.parse(p).medicines;
  expect(meds.map(m => m.medication)).toEqual(['First', 'Second']);
  expect(meds[0].notes).toBe('');
  expect(meds[1].notes).toBe('after food');
});
