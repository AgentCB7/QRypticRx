import { test, expect } from '@playwright/test';
import { uiLogin, TEST_DOCTOR } from './helpers.js';

let sharedPage;
let prescriptionId;

test.describe.serial('Doctor journey', () => {
  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    await uiLogin(sharedPage, TEST_DOCTOR.email, TEST_DOCTOR.password);
    await sharedPage.waitForURL('**/doctor');
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  test('doctor: login → create prescription → view detail with QR code', async () => {
    await expect(sharedPage).toHaveTitle(/QRypticRx/);
    await sharedPage.screenshot({ path: 'e2e/screenshots/01-doctor-dashboard.png', fullPage: true });

    await sharedPage.click('text=New Prescription');
    await sharedPage.waitForURL('**/doctor/new');

    await sharedPage.fill('#patient_name', 'Alice Wonderland');
    await sharedPage.fill('#patient_phone', '+8801712345678');
    await sharedPage.fill('#medication-0', 'Amoxicillin 500mg');
    await sharedPage.locator('[aria-label="Medicine 1 Morning doses"] [aria-label="increase"]').click();

    await sharedPage.screenshot({ path: 'e2e/screenshots/02-doctor-new-prescription-filled.png', fullPage: true });

    await sharedPage.click('text=Create & Generate QR Code');
    await sharedPage.waitForURL('**/doctor/prescription/**');

    const url = sharedPage.url();
    prescriptionId = url.split('/prescription/')[1];

    await sharedPage.waitForSelector('canvas');
    await sharedPage.screenshot({ path: 'e2e/screenshots/03-doctor-prescription-detail.png', fullPage: true });

    await expect(sharedPage.locator('canvas')).toBeVisible();
    await expect(sharedPage.getByRole('heading', { name: 'Prescription Details' })).toBeVisible();
    await expect(sharedPage.locator('text=Alice Wonderland')).toBeVisible();
  });

  test('prescription detail: PDF download button is visible alongside QR code', async () => {
    await sharedPage.goto(`/QRypticRx/doctor/prescription/${prescriptionId}`);
    await sharedPage.waitForSelector('canvas');

    const downloadBtn = sharedPage.getByRole('button', { name: 'Download PDF' });
    const printBtn = sharedPage.getByRole('button', { name: 'Print' });

    await expect(downloadBtn).toBeVisible();
    await expect(printBtn).toBeVisible();
    await expect(sharedPage.locator('canvas')).toBeVisible();

    await sharedPage.screenshot({ path: 'e2e/screenshots/04-doctor-prescription-pdf-view.png', fullPage: true });
  });
});
