# QRypticRx

A secure e-prescription system where doctors create digitally signed prescriptions that generate QR codes, and pharmacists scan those codes to verify authenticity before dispensing medication.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [Prescription Signing & Verification](#prescription-signing--verification)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Deployment](#deployment)
- [User Roles & Workflows](#user-roles--workflows)

---

## Overview

QRypticRx solves the problem of prescription fraud by digitally signing every prescription with the issuing doctor's RSA-2048 private key. A pharmacist scans the QR code, the backend verifies the cryptographic signature and checks that the prescription hasn't been tampered with or already dispensed, and only then allows the medication to be released.

**Live URLs:**
- Frontend: `https://<user>.github.io/QRypticRx/`
- Backend: Deployed on [Railway](https://railway.app)

---

## Features

**Doctors**
- Register and await admin approval before gaining access
- Create prescriptions with one or more medications, each with dosage and duration
- Download a signed prescription as a PDF
- View full history of issued prescriptions

**Pharmacists**
- Register and await admin approval
- Scan a QR code (camera or image upload) to verify a prescription's authenticity
- Dispense individual medication items; each item is independently tracked
- View a dashboard of recent dispensing activity

**Admins**
- Review registration applications submitted by doctors and pharmacists
- Approve or reject applicants with an optional rejection reason
- RSA keypairs are generated automatically for doctors upon approval

**Security**
- Every login requires a one-time password emailed to the user (2FA)
- New accounts must verify their email address before the application enters the admin review queue
- All prescriptions are cryptographically signed and hash-protected
- Rate limiting on authentication endpoints to prevent brute-force attacks

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React SPA)            │
│          GitHub Pages — /QRypticRx/             │
│                                                  │
│  /login  /register  /doctor  /pharmacist  /admin │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS  (Bearer JWT)
┌───────────────────▼─────────────────────────────┐
│               Backend (Express API)             │
│                   Railway                        │
│                                                  │
│  /api/auth   /api/prescriptions   /api/admin     │
└───────────────────┬─────────────────────────────┘
                    │ pg (SSL)
┌───────────────────▼─────────────────────────────┐
│            PostgreSQL (Supabase)                 │
│                                                  │
│  users  prescriptions  prescription_items        │
│  otp_codes  audit_logs                          │
└─────────────────────────────────────────────────┘
```

The backend is a stateless Express API — JWTs carry all session state. The frontend is a static SPA that talks to the backend over HTTPS. The database lives on Supabase (managed PostgreSQL).

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | ^4.19 | HTTP framework |
| PostgreSQL (`pg`) | ^8.12 | Database driver |
| `jsonwebtoken` | ^9.0 | JWT signing & verification |
| `bcryptjs` | ^3.0 | Password hashing |
| `nodemailer` | ^6.9 | Email delivery (Gmail SMTP) |
| `express-rate-limit` | ^8.5 | Brute-force protection |
| `helmet` | ^7.1 | Security headers |
| `cors` | ^2.8 | CORS middleware |
| `uuid` | ^10.0 | UUID generation |
| Jest + Supertest | ^29.7 / ^7.0 | Testing |
| nodemon | ^3.1 | Dev hot-reload |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | ^18.3 | UI framework |
| React Router v6 | ^6.24 | Client-side routing |
| Vite | ^5.3 | Build tool & dev server |
| `qrcode` | ^1.5 | QR code generation |
| `jsqr` | ^1.4 | QR code decoding (camera / image) |
| `jspdf` | ^2.5 | PDF export |
| `html2canvas` | ^1.4 | Element → canvas → PDF |
| `gh-pages` | ^6.0 | GitHub Pages deployment |

---

## Project Structure

```
QRypticRx/
├── package.json              # Root — concurrently for dev
├── railway.json              # Railway deploy config
├── nixpacks.toml             # Build phases for Railway
│
├── backend/
│   ├── server.js             # Entry point; env validation + startup
│   ├── app.js                # Express app (middleware, routes)
│   ├── Procfile
│   │
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── prescriptions.js  # /api/prescriptions/*
│   │   └── admin.js          # /api/admin/*
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── prescriptionController.js
│   │   └── adminController.js
│   │
│   ├── middleware/
│   │   └── auth.js           # JWT + requireRole()
│   │
│   ├── lib/
│   │   ├── keyVault.js       # AES-256-GCM encrypt/decrypt private keys
│   │   ├── otp.js            # 6-digit OTP generation & verification
│   │   ├── mailer.js         # Nodemailer transport (SMTP / console)
│   │   ├── emails.js         # Email HTML templates
│   │   └── payload.js        # Canonical prescription payload builder
│   │
│   ├── db/
│   │   ├── pool.js           # pg.Pool (SSL)
│   │   ├── schema.sql        # Full schema (run once to initialize)
│   │   ├── seedAdmin.js      # Bootstrap admin user on startup
│   │   └── migrations/
│   │       ├── 001_admin_approval.sql
│   │       ├── 002_doctor_keys.sql
│   │       ├── 003_email_otp.sql
│   │       ├── 004_prescription_items.sql
│   │       └── 005_prescriptions_nullable_instructions.sql
│   │
│   └── test/
│       ├── setup.js
│       ├── helpers.js
│       ├── admin.test.js
│       ├── auth.register.test.js
│       ├── auth.login.test.js
│       ├── auth.login2fa.test.js
│       ├── auth.verifyEmail.test.js
│       ├── prescriptions.test.js
│       ├── otp.test.js
│       ├── mailer.test.js
│       ├── keyVault.test.js
│       ├── payload.test.js
│       ├── ratelimit.test.js
│       └── seedAdmin.test.js
│
└── frontend/
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx              # React DOM entry
        ├── App.jsx               # Router + all route definitions
        ├── index.css             # Global CSS variables & base styles
        │
        ├── api/
        │   ├── client.js         # Base fetch wrapper (Bearer token)
        │   ├── auth.js           # Auth API calls
        │   ├── prescriptions.js  # Prescription API calls
        │   └── admin.js          # Admin API calls
        │
        ├── components/
        │   ├── AuthContext.jsx   # Auth state (localStorage) + useAuth hook
        │   ├── Layout.jsx        # Header, footer, logout
        │   ├── ProtectedRoute.jsx # Role-based route guard
        │   └── QRCodeDisplay.jsx # qrcode library wrapper
        │
        └── pages/
            ├── LandingPage.jsx
            ├── LoginPage.jsx
            ├── LoginVerifyPage.jsx       # Login OTP entry
            ├── RegisterPage.jsx
            ├── RegisterSubmittedPage.jsx
            ├── VerifyEmailPage.jsx       # Registration OTP entry
            ├── DoctorDashboard.jsx
            ├── NewPrescription.jsx
            ├── PrescriptionDetail.jsx    # View + download PDF
            ├── PharmacistDashboard.jsx
            ├── ScanVerify.jsx            # QR scan + dispense
            ├── AdminDashboard.jsx
            └── ApplicationDetail.jsx     # Approve / reject
```

---

## Database Schema

### `users`
Stores all accounts regardless of role.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | VARCHAR(255) | |
| `email` | VARCHAR(255) UNIQUE | |
| `password` | VARCHAR(255) | bcrypt hash |
| `role` | VARCHAR(50) | `doctor`, `pharmacist`, `admin` |
| `status` | VARCHAR(50) | `unverified` → `pending` → `approved` / `rejected` |
| `public_key` | TEXT | RSA-2048 public key (doctors only) |
| `private_key_enc` | TEXT | AES-256-GCM encrypted private key (doctors only) |
| `pharmacy_name` | VARCHAR(255) | Pharmacists |
| `license_number` | VARCHAR(100) | Pharmacists |
| `affiliation` | VARCHAR(255) | Doctors |
| `applicant_note` | TEXT | Optional note from applicant |
| `rejection_reason` | TEXT | Set by admin on rejection |
| `reviewed_by` | UUID FK → users | Admin who reviewed the application |
| `reviewed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | `NOW()` |

### `prescriptions`
Master prescription records, one row per prescription.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `doctor_id` | UUID FK → users | |
| `patient_name` | VARCHAR(255) | |
| `patient_ic` | VARCHAR(50) | Patient ID / IC number |
| `valid_until` | TIMESTAMPTZ | Expiry date |
| `status` | VARCHAR(50) | `active`, `dispensed`, `expired` |
| `hash` | VARCHAR(64) | SHA-256 hex of canonical payload |
| `signature` | TEXT | RSA signature (base64) |
| `created_at` | TIMESTAMPTZ | |

### `prescription_items`
Individual medication line items within a prescription (supports multi-drug prescriptions).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `prescription_id` | UUID FK → prescriptions | `ON DELETE CASCADE` |
| `position` | INT | 0-based ordering within the prescription |
| `medication` | VARCHAR(255) | Drug name |
| `dosage` | VARCHAR(255) | e.g., `500mg twice daily` |
| `duration_days` | INT | Treatment duration |
| `notes` | TEXT | Optional instructions (nullable) |
| `status` | VARCHAR(50) | `active`, `dispensed` |
| `dispensed_at` | TIMESTAMPTZ | Set when dispensed |
| `dispensed_by` | UUID FK → users | Pharmacist who dispensed |
| `created_at` | TIMESTAMPTZ | |

**Constraints:** UNIQUE on `(prescription_id, position)`.

### `otp_codes`
Stores hashed one-time passwords for email verification and login.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | `ON DELETE CASCADE` |
| `purpose` | VARCHAR(50) | `email_verify`, `login` |
| `code_hash` | VARCHAR(64) | SHA-256 hex of the plaintext code |
| `expires_at` | TIMESTAMPTZ | 10 minutes from creation |
| `attempts` | INT | Incremented on each wrong guess; max 5 |
| `consumed_at` | TIMESTAMPTZ | Set when code is successfully verified |
| `created_at` | TIMESTAMPTZ | |

**Rate limiting:** A new code cannot be issued within 60 seconds of the previous one (checked in `lib/otp.js`).

### `audit_logs`
Immutable dispensing and admin-action log.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `prescription_id` | UUID | |
| `item_id` | UUID | Which prescription item was dispensed |
| `pharmacist_id` | UUID FK → users | |
| `pharmacy_name` | VARCHAR(255) | Denormalized at time of action |
| `action` | VARCHAR(50) | `dispensed`, `approved_user`, `rejected_user` |
| `timestamp` | TIMESTAMPTZ | `NOW()` |

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated endpoints require an `Authorization: Bearer <jwt>` header.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create a new account (doctor or pharmacist) |
| POST | `/verify-email` | — | Confirm registration OTP; moves account to `pending` |
| POST | `/resend-otp` | — | Resend a `email_verify` or `login` OTP (60-sec cooldown) |
| POST | `/login` | — | Validate password; sends login OTP to email |
| POST | `/login/verify` | — | Confirm login OTP; returns signed JWT |

**Register** `POST /api/auth/register`
```json
{
  "name": "Dr. Jane Smith",
  "email": "jane@hospital.com",
  "password": "s3cur3pass",
  "role": "doctor",
  "affiliation": "General Hospital"
}
```
Immediately emails a 6-digit verification code. Account is `unverified` until the code is confirmed.

**Login flow** (two-step)
1. `POST /api/auth/login` — `{ "email", "password" }` — validates credentials, emails OTP
2. `POST /api/auth/login/verify` — `{ "email", "otp" }` — validates OTP, returns `{ token, user }`

---

### Prescriptions — `/api/prescriptions`

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/` | doctor | Create a new prescription |
| GET | `/` | doctor | List own prescriptions |
| GET | `/:id` | doctor | Get prescription detail + items |
| POST | `/verify` | pharmacist | Verify a QR code payload |
| POST | `/:id/items/:itemId/dispense` | pharmacist | Dispense a single medication item |

**Create prescription** `POST /api/prescriptions`
```json
{
  "patient_name": "John Doe",
  "patient_ic": "990101-14-5678",
  "valid_until": "2026-09-01",
  "items": [
    {
      "medication": "Amoxicillin",
      "dosage": "500mg",
      "duration_days": 7,
      "notes": "Take with food"
    }
  ]
}
```
Returns the created prescription including a `qr_payload` (`{ id, hash }` JSON string) ready to encode as a QR code.

**Verify QR** `POST /api/prescriptions/verify`
```json
{ "id": "<uuid>", "hash": "<sha256 hex>" }
```
Returns prescription details and validity status. The response indicates whether the signature is valid, whether the hash matches, and the current status of each medication item.

---

### Admin — `/api/admin`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/applications` | admin | List all pending applications |
| GET | `/applications/:id` | admin | View an applicant's details |
| POST | `/applications/:id/approve` | admin | Approve; generates RSA keypair for doctors |
| POST | `/applications/:id/reject` | admin | Reject with optional reason |

---

## Authentication & Security

### JWT
Tokens are signed with `JWT_SECRET` and carry `{ id, role, name, email }`. They expire after **8 hours**. The `authenticate` middleware in `middleware/auth.js` decodes the token and attaches `req.user`; `requireRole(...roles)` throws `403` if the role doesn't match.

### Email OTP (2FA)
Every login requires a second factor:
- A 6-digit code is generated using `crypto.randomInt`
- Stored SHA-256 hashed in `otp_codes` (plaintext never persisted)
- Expires after **10 minutes**
- Max **5 wrong attempts** before the code is invalidated
- **60-second cooldown** before a new code can be requested
- In production: delivered via Gmail SMTP (`lib/mailer.js`)
- In development / test: printed to the server console and stored in an in-memory outbox

### Account Lifecycle
```
register ──► unverified ──► (verify email OTP) ──► pending ──► approved / rejected
                                                         ▲
                                                   admin review
```
Only `approved` users can log in and access role-specific endpoints.

### Security Headers
`helmet` sets secure HTTP headers on every response (CSP, HSTS, X-Frame-Options, etc.).

### Rate Limiting
`express-rate-limit` is applied to authentication endpoints to prevent brute-force attacks.

### Password Storage
Passwords are hashed with `bcryptjs` (salt rounds: 10).

---

## Prescription Signing & Verification

This is the core security mechanism that prevents prescription forgery.

### Key Generation
When a doctor's account is approved, the admin controller (`controllers/adminController.js`) generates an RSA-2048 keypair using Node's built-in `crypto` module:
- The **public key** is stored in plaintext in `users.public_key`
- The **private key** is encrypted with AES-256-GCM using `KEY_SECRET` (via `lib/keyVault.js`) and stored in `users.private_key_enc`

### Signing (on prescription creation)
1. A canonical JSON payload is assembled by `lib/payload.js` from the prescription fields (patient details, medications, `valid_until` normalized to ISO 8601)
2. The payload is SHA-256 hashed → stored as `prescriptions.hash`
3. The hash is signed with the doctor's decrypted RSA private key → stored as `prescriptions.signature` (base64)
4. The QR code encodes `JSON.stringify({ id, hash })`

### Verification (on QR scan)
1. The pharmacist scans the QR code; the frontend sends `{ id, hash }` to `POST /api/prescriptions/verify`
2. The backend fetches the prescription row by `id`
3. It rebuilds the canonical payload from the stored row and recomputes the SHA-256 hash
4. It compares the recomputed hash against both the stored hash and the QR-supplied hash
5. It verifies the RSA signature against the doctor's stored public key
6. A prescription is **valid** only if all three checks pass: hash match, QR hash match, and valid signature

This means the prescription is tamper-evident (any field change breaks the hash) and unforgeable (the signature can only be created by the doctor's private key).

### QR Code Format
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000", "hash": "a3f5c..." }
```
Encoded as JSON string. Decoded client-side by `jsqr` from a camera stream or uploaded image file.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Supabase free tier works)
- A Gmail account with an App Password (for email in production; optional locally)

### 1. Clone & install
```bash
git clone https://github.com/<user>/QRypticRx.git
cd QRypticRx
npm run install:all
```

### 2. Set up the database
Run `backend/db/schema.sql` against your PostgreSQL database to create all tables and indexes. This only needs to be done once:
```bash
psql $DATABASE_URL -f backend/db/schema.sql
```

### 3. Configure environment variables
Create `backend/.env` (see [Environment Variables](#environment-variables) below).

Optionally create `frontend/.env`:
```
VITE_API_URL=http://localhost:3000
```

### 4. Start the dev servers
```bash
npm run dev
```
This starts:
- Backend on `http://localhost:3000` (via nodemon)
- Frontend Vite dev server (typically `http://localhost:5173`)

### 5. Create the first admin
The backend bootstraps an admin user on startup using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment (see `db/seedAdmin.js`). Log in with those credentials to approve the first doctor and pharmacist accounts.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (production) |
| `JWT_SECRET` | Yes | Secret for signing JWTs; use a long random string |
| `FRONTEND_URL` | Yes | Allowed CORS origin; server refuses to start if unset |
| `KEY_SECRET` | Yes | Secret for AES-256-GCM encryption of doctor private keys; server refuses to start if unset |
| `ADMIN_EMAIL` | Yes | Email of the bootstrapped admin user |
| `ADMIN_PASSWORD` | Yes | Password of the bootstrapped admin user |
| `SMTP_USER` | No | Gmail address for sending OTP emails (production) |
| `SMTP_PASS` | No | Gmail App Password for `SMTP_USER` (production) |
| `SMTP_FROM` | No | Optional `From` address; defaults to `SMTP_USER` |
| `PORT` | No | HTTP port; defaults to `3000` |

If `SMTP_USER` / `SMTP_PASS` are not set, OTP codes are printed to the server console instead of being emailed — useful during local development.

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend base URL; defaults to `http://localhost:3000` |

---

## Development Commands

From the **repo root** (requires `npm install` first):

```bash
npm run install:all      # Install dependencies for root + backend + frontend
npm run dev              # Run backend (nodemon) + frontend (Vite) concurrently
```

Individual services:
```bash
npm run dev --prefix backend      # Backend only — hot-reload via nodemon
npm run dev --prefix frontend     # Frontend only — Vite dev server
npm run build --prefix frontend   # Production build to frontend/dist/
npm run deploy --prefix frontend  # Build + push to GitHub Pages (gh-pages branch)
```

Database migrations (run manually against your database):
```bash
node backend/run-migration.js backend/db/migrations/004_prescription_items.sql
```

---

## Testing

The backend has a full Jest + Supertest test suite covering 13 areas:

```bash
npm test --prefix backend          # Run all tests (--runInBand)
npm run test:watch --prefix backend  # Watch mode
```

**Important:** Tests require a separate `TEST_DATABASE_URL` environment variable pointing to a throwaway database. The test suite **truncates all tables** before each run and will refuse to execute if `TEST_DATABASE_URL` equals `DATABASE_URL`.

| Test file | What it covers |
|---|---|
| `auth.register.test.js` | Registration, duplicate email, missing fields |
| `auth.verifyEmail.test.js` | Email OTP confirmation |
| `auth.login.test.js` | Password validation, account status checks |
| `auth.login2fa.test.js` | Login OTP flow, expiry, attempt limits |
| `admin.test.js` | Application listing, approval, rejection, keypair generation |
| `prescriptions.test.js` | Create, list, verify, dispense, tamper detection |
| `otp.test.js` | Code generation, hashing, expiry, cooldown |
| `mailer.test.js` | Transport selection, in-memory outbox |
| `keyVault.test.js` | AES-256-GCM encrypt/decrypt round-trip |
| `payload.test.js` | Canonical payload serialization |
| `ratelimit.test.js` | Auth endpoint rate limiting |
| `seedAdmin.test.js` | Admin bootstrap idempotency |

The frontend has no automated tests; manual testing is done via the browser.

---

## Deployment

### Backend — Railway

Railway reads `railway.json` and `nixpacks.toml` from the repo root.

**`railway.json`:**
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node backend/server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**`nixpacks.toml`:**
```toml
[phases.install]
cmds = ["npm install --prefix backend"]

[start]
cmd = "node backend/server.js"
```

Set all required environment variables in Railway's variable dashboard before deploying.

### Frontend — GitHub Pages

```bash
npm run deploy --prefix frontend
```

This runs `vite build` and then uses `gh-pages` to push `frontend/dist/` to the `gh-pages` branch. The Vite config sets `base: "/QRypticRx/"` and React Router is configured with `basename="/QRypticRx"` to match the GitHub Pages subpath.

A `404.html` redirect script handles direct URL navigation (deep-linking) on GitHub Pages.

---

## User Roles & Workflows

### Doctor

1. Register at `/register` with role `doctor`
2. Check email for verification OTP → enter at `/verify-email`
3. Wait for admin approval (account status: `pending`)
4. On approval: log in at `/login`, enter OTP from email at `/login/verify`
5. Create prescriptions at `/doctor/new` — specify patient details and one or more medications
6. Share the generated QR code (or download the PDF) with the patient
7. View all issued prescriptions at `/doctor`

### Pharmacist

1. Register at `/register` with role `pharmacist`, providing pharmacy name and license number
2. Verify email and await admin approval (same flow as doctor)
3. After approval: log in and navigate to `/pharmacist/scan`
4. Scan the patient's QR code using the camera or upload an image
5. The system shows prescription details and verification status
6. Dispense individual medication items; each dispense is logged in `audit_logs`

### Admin

1. The first admin is bootstrapped from `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables
2. Log in and navigate to `/admin`
3. Review pending applications — view applicant details, affiliation / pharmacy info
4. Approve or reject; approved doctors automatically receive an RSA-2048 keypair
5. Rejected applicants receive an email with the reason (if provided)
