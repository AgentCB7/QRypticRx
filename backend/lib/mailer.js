const outbox = [];

function useRealTransport() {
  return !!process.env.RESEND_API_KEY;
}

async function sendMail({ to, subject, text }) {
  console.log(`[mailer] RESEND_API_KEY present: ${!!process.env.RESEND_API_KEY}`);
  if (!useRealTransport()) {
    outbox.push({ to, subject, text });
    console.log(`[mailer] no API key configured; email to ${to}: ${subject}\n${text}`);
    return;
  }
  console.log(`[mailer] sending via Resend to ${to}`);
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const result = await resend.emails.send({
      from: 'QRypticRx <onboarding@resend.dev>',
      to,
      subject,
      text,
    });
    console.log(`[mailer] Resend response:`, result);
  } catch (err) {
    console.error(`[mailer] Resend error:`, err.message, err);
    throw err;
  }
}

module.exports = { sendMail, outbox };
