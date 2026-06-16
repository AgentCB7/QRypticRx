import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import QRCode from 'qrcode';
import { uiLogin, getLatestOtp, TEST_DOCTOR, TEST_PHARMACIST, API } from './helpers.js';

let sharedPage;
let qrImagePath;

async function createTestPrescription(page) {
  await page.request.post(`${API}/api/auth/login`, {
    data: { email: TEST_DOCTOR.email, password: TEST_DOCTOR.password },
  });
  const code = await getLatestOtp(page, TEST_DOCTOR.email);
  const verifyRes = await page.request.post(`${API}/api/auth/login/verify`, {
    data: { email: TEST_DOCTOR.email, code },
  });
  const { token } = await verifyRes.json();

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const rxRes = await page.request.post(`${API}/api/prescriptions`, {
    data: {
      patient_name: 'Bob Tester',
      patient_ic: '800101-01-9999',
      valid_until: tomorrow,
      medicines: [{ medication: 'Paracetamol 500mg', dosage: '1+0+1 tablet', duration_days: 5 }],
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  return await rxRes.json();
}

test.describe.serial('Pharmacist journey', () => {
  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();

    const rx = await createTestPrescription(sharedPage);
    const qrPayload = rx.qr_payload;

    const dir = join(tmpdir(), 'qrypticrox-e2e');
    mkdirSync(dir, { recursive: true });
    qrImagePath = join(dir, 'test-prescription.png');
    await QRCode.toFile(qrImagePath, qrPayload);

    await uiLogin(sharedPage, TEST_PHARMACIST.email, TEST_PHARMACIST.password);
    await sharedPage.waitForURL('**/pharmacist');
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  test('pharmacist: login → dashboard → navigate to scan page', async () => {
    await expect(sharedPage.locator('h1')).toContainText(/pharmacist/i);
    await sharedPage.screenshot({ path: 'e2e/screenshots/05-pharmacist-dashboard.png', fullPage: true });

    await sharedPage.click('text=Scan / Upload QR');
    await sharedPage.waitForURL('**/pharmacist/scan');

    await expect(sharedPage.getByRole('button', { name: /Upload QR Image/i })).toBeVisible();
    await sharedPage.screenshot({ path: 'e2e/screenshots/06-pharmacist-scan-page.png', fullPage: true });
  });

  test('pharmacist: upload QR image → verify prescription → dispense item', async () => {
    await sharedPage.goto('/QRypticRx/pharmacist/scan');
    await sharedPage.waitForSelector('text=Upload QR Image');

    const fileInput = sharedPage.locator('input[type="file"]');
    await fileInput.setInputFiles(qrImagePath);

    await sharedPage.waitForSelector('text=Prescription Valid', { timeout: 10000 });
    await expect(sharedPage.locator('text=Bob Tester')).toBeVisible();
    await sharedPage.screenshot({ path: 'e2e/screenshots/07-pharmacist-verified.png', fullPage: true });

    await sharedPage.getByRole('button', { name: 'Dispense' }).first().click();
    await sharedPage.waitForSelector('text=dispensed', { timeout: 10000 });
    await sharedPage.screenshot({ path: 'e2e/screenshots/08-pharmacist-dispensed.png', fullPage: true });

    await expect(sharedPage.locator('.badge-dispensed').first()).toBeVisible();
  });
});
