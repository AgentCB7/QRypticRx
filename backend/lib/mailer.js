const outbox = [];

function useRealTransport() {
  return !!process.env.RESEND_API_KEY;
}

async function sendMail({ to, subject, text }) {
  if (!useRealTransport()) {
    outbox.push({ to, subject, text });
    console.log(`[mailer] no API key configured; email to ${to}: ${subject}\n${text}`);
    return;
  }
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'QRypticRx <onboarding@resend.dev>',
    to,
    subject,
    text,
  });
}

module.exports = { sendMail, outbox };
