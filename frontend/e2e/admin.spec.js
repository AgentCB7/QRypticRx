import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { uiLogin, API } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('admin: login → view pending applications → approve a doctor', async ({ page }) => {
  let ADMIN_EMAIL = '', ADMIN_PASSWORD = '';
  try {
    const creds = JSON.parse(readFileSync(resolve(__dirname, '.admin-creds.json'), 'utf8'));
    ADMIN_EMAIL = creds.email || '';
    ADMIN_PASSWORD = creds.password || '';
  } catch {}
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL / ADMIN_PASSWORD not set');

  const pendingEmail = `e2e-pending-${Date.now()}@test.com`;
  await page.request.post(`${API}/api/auth/register`, {
    data: {
      email: pendingEmail,
      password: 'E2eTest1234!',
      name: 'Dr Pending Demo',
      license_number: `PEND-${Date.now()}`,
      affiliation: 'Demo Clinic',
      role: 'doctor',
    },
  });
  await page.waitForTimeout(600);
  const outboxRes = await page.request.get(`${API}/test/outbox`);
  const outbox = await outboxRes.json();
  const otpEntry = outbox.filter(e => e.to === pendingEmail).at(-1);
  const otpMatch = otpEntry?.text.match(/\b(\d{6})\b/);
  if (otpMatch) {
    await page.request.post(`${API}/api/auth/verify-email`, {
      data: { email: pendingEmail, code: otpMatch[1] },
    });
  }

  await uiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.waitForURL('**/admin');

  await expect(page.locator('h1')).toContainText('Admin Dashboard');
  await page.screenshot({ path: 'e2e/screenshots/09-admin-dashboard.png', fullPage: true });

  const pendingBtn = page.getByRole('button', { name: 'pending' });
  await pendingBtn.click();

  const applicationCards = page.locator('.card').filter({ hasText: 'Review →' });
  const count = await applicationCards.count();

  if (count === 0) {
    await page.screenshot({ path: 'e2e/screenshots/10-admin-no-pending.png', fullPage: true });
    test.skip(true, 'No pending applications to approve');
    return;
  }

  await applicationCards.first().click();
  await page.waitForURL('**/admin/applications/**');

  const applicantName = await page.locator('h1').innerText();
  await page.screenshot({ path: 'e2e/screenshots/11-admin-application-detail.png', fullPage: true });

  await page.getByRole('button', { name: 'Approve' }).click();
  await page.waitForURL('**/admin');

  await page.getByRole('button', { name: 'approved' }).click();
  await expect(page.locator('.card').filter({ hasText: applicantName.trim() })).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/12-admin-approved-confirmed.png', fullPage: true });
});
