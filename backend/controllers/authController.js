const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { issueOtp, verifyOtp } = require('../lib/otp');
const { sendMail } = require('../lib/mailer');
const { verificationEmail, loginCodeEmail } = require('../lib/emails');

const SALT_ROUNDS = 12;

async function register(req, res) {
  const { name, email, password, role, pharmacy_name, license_number, affiliation, applicant_note } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  if (!['doctor', 'pharmacist'].includes(role)) {
    return res.status(400).json({ error: 'role must be doctor or pharmacist' });
  }
  if (!license_number) {
    return res.status(400).json({ error: 'license_number is required' });
  }
  if (role === 'doctor' && !affiliation) {
    return res.status(400).json({ error: 'affiliation is required for doctors' });
  }
  if (role === 'pharmacist' && !pharmacy_name) {
    return res.status(400).json({ error: 'pharmacy_name is required for pharmacists' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const inserted = await pool.query(
      `INSERT INTO users (name, email, password, role, pharmacy_name, license_number, affiliation, applicant_note, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unverified')
       RETURNING id`,
      [name, email, hashed, role, pharmacy_name || null, license_number, affiliation || null, applicant_note || null]
    );

    const issued = await issueOtp(inserted.rows[0].id, 'email_verify');
    await sendMail({ to: email, ...verificationEmail(issued.code) });

    res.status(202).json({
      message: 'Account created. Check your email for a 6-digit verification code.',
      email,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password, role, pharmacy_name, status, rejection_reason FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'unverified') {
      return res.status(403).json({ error: 'Please verify your email before logging in.', status: 'unverified' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is awaiting admin approval.', status: 'pending' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'Your application was denied.',
        status: 'rejected',
        reason: user.rejection_reason || null,
      });
    }

    const issued = await issueOtp(user.id, 'login');
    if (issued.ok) {
      await sendMail({ to: user.email, ...loginCodeEmail(issued.code) });
    }

    res.json({ otpRequired: true, email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

function otpErrorMessage(reason) {
  switch (reason) {
    case 'expired': return 'Code expired. Please request a new one.';
    case 'too_many_attempts': return 'Too many attempts. Please request a new code.';
    case 'no_code': return 'No active code. Please request a new one.';
    default: return 'Invalid code.';
  }
}

async function verifyEmail(req, res) {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'email and code are required' });
  }
  try {
    const result = await pool.query('SELECT id, status FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || user.status !== 'unverified') {
      return res.status(400).json({ error: 'No pending email verification for this account' });
    }
    const check = await verifyOtp(user.id, 'email_verify', code);
    if (!check.ok) {
      return res.status(400).json({ error: otpErrorMessage(check.reason) });
    }
    await pool.query("UPDATE users SET status = 'pending' WHERE id = $1", [user.id]);
    res.json({ message: "Email verified. You'll be able to log in once an admin approves your account." });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
}

async function resendOtp(req, res) {
  const { email, purpose } = req.body;
  if (!email || !['email_verify', 'login'].includes(purpose)) {
    return res.status(400).json({ error: 'email and a valid purpose are required' });
  }
  try {
    const result = await pool.query('SELECT id, status, email FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    const eligible =
      user &&
      ((purpose === 'email_verify' && user.status === 'unverified') ||
        (purpose === 'login' && user.status === 'approved'));
    if (!eligible) {
      return res.json({ message: 'If your account is eligible, a new code has been sent.' });
    }
    const issued = await issueOtp(user.id, purpose);
    if (!issued.ok) {
      if (issued.reason === 'cooldown') {
        return res.status(429).json({ error: `Please wait ${issued.retryAfter}s before requesting another code.` });
      }
      return res.status(400).json({ error: 'Could not issue a code. Try again later.' });
    }
    const tmpl = purpose === 'email_verify' ? verificationEmail(issued.code) : loginCodeEmail(issued.code);
    await sendMail({ to: user.email, ...tmpl });
    res.json({ message: 'A new code has been sent.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Could not resend code' });
  }
}

async function loginVerify(req, res) {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'email and code are required' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, pharmacy_name, status FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || user.status !== 'approved') {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    const check = await verifyOtp(user.id, 'login', code);
    if (!check.ok) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        pharmacy_name: user.pharmacy_name,
      },
    });
  } catch (err) {
    console.error('Login verify error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { register, login, verifyEmail, loginVerify, resendOtp };
