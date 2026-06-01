const outbox = [];

let transporter = null;

function useRealTransport() {
  return process.env.NODE_ENV === 'production' && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
}

function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, text }) {
  if (!useRealTransport()) {
    outbox.push({ to, subject, text });
    console.log(`[mailer] no SMTP configured; email to ${to}: ${subject}\n${text}`);
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({ from, to, subject, text });
}

module.exports = { sendMail, outbox };
