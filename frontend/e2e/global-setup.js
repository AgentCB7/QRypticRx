import { request } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TEST_DOCTOR, TEST_PHARMACIST, API } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const envPath = resolve(__dirname, '../../backend/.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

async function getLatestOtpApi(ctx, email) {
  await new Promise(r => setTimeout(r, 400));
  const res = await ctx.get(`${API}/test/outbox`);
  const outbox = await res.json();
  const entries = outbox.filter(e => e.to === email);
  const latest = entries[entries.length - 1];
  const match = latest?.text.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}

export default async function globalSetup() {
  const ctx = await request.newContext();

  for (const user of [TEST_DOCTOR, TEST_PHARMACIST]) {
    const reg = await ctx.post(`${API}/api/auth/register`, { data: user });
    if (reg.status() === 202) {
      const code = await getLatestOtpApi(ctx, user.email);
      if (code) {
        await ctx.post(`${API}/api/auth/verify-email`, { data: { email: user.email, code } });
      }
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  writeFileSync(
    resolve(__dirname, '.admin-creds.json'),
    JSON.stringify({ email: adminEmail || '', password: adminPassword || '' })
  );

  if (!adminEmail || !adminPassword) {
    console.warn('[E2E global-setup] ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping approval step');
    await ctx.dispose();
    return;
  }

  await ctx.post(`${API}/api/auth/login`, { data: { email: adminEmail, password: adminPassword } });
  const adminCode = await getLatestOtpApi(ctx, adminEmail);
  if (!adminCode) {
    console.warn('[E2E global-setup] Could not read admin OTP — skipping approval step');
    await ctx.dispose();
    return;
  }

  const loginRes = await ctx.post(`${API}/api/auth/login/verify`, {
    data: { email: adminEmail, code: adminCode },
  });
  const { token: adminToken } = await loginRes.json();

  const appsRes = await ctx.get(`${API}/api/admin/applications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const { applications } = await appsRes.json();
  for (const app of applications.filter(a => a.status === 'pending')) {
    await ctx.post(`${API}/api/admin/applications/${app.id}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  await ctx.dispose();
}
