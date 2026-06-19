const outbox = [];

async function sendMail({ to, subject, text, html }) {
  if (!process.env.BREVO_API_KEY) {
    outbox.push({ to, subject, text });
    console.log(`[mailer] no API key configured; email to ${to}: ${subject}\n${text}`);
    return;
  }

  console.log(`[mailer] sending via Brevo to ${to}`);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'QRypticRx', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text,
      ...(html && { htmlContent: html }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[mailer] Brevo error ${res.status}:`, body);
    throw new Error(`Brevo delivery failed: ${res.status}`);
  }

  console.log(`[mailer] Brevo accepted message to ${to}`);
}

module.exports = { sendMail, outbox };
