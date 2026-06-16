export const API = 'http://localhost:3000';

export const TEST_DOCTOR = {
  email: 'e2e-doctor@test.com',
  password: 'E2eTest1234!',
  name: 'Dr E2E Test',
  license_number: 'E2E-DOC-001',
  affiliation: 'E2E Test Clinic',
  role: 'doctor',
};

export const TEST_PHARMACIST = {
  email: 'e2e-pharm@test.com',
  password: 'E2eTest1234!',
  name: 'E2E Pharmacist',
  license_number: 'E2E-PH-001',
  pharmacy_name: 'E2E Test Pharmacy',
  role: 'pharmacist',
};

export const TEST_PENDING_DOCTOR = {
  email: 'e2e-pending@test.com',
  password: 'E2eTest1234!',
  name: 'Dr Pending Review',
  license_number: 'E2E-PEND-001',
  affiliation: 'E2E Pending Clinic',
  role: 'doctor',
};

export async function getLatestOtp(page, email) {
  await page.waitForTimeout(800);
  const response = await page.request.get(`${API}/test/outbox`);
  const outbox = await response.json();
  const entries = outbox.filter(e => e.to === email);
  const latest = entries[entries.length - 1];
  const match = latest?.text.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}

export async function uiLogin(page, email, password) {
  await page.goto('/QRypticRx/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login/verify');
  const code = await getLatestOtp(page, email);
  await page.fill('#code', code);
  await page.click('button[type="submit"]');
}
