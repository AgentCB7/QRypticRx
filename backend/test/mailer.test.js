const { sendMail, outbox } = require('../lib/mailer');
const { verificationEmail, loginCodeEmail } = require('../lib/emails');

beforeEach(() => { outbox.length = 0; });

test('sendMail records to outbox when no SMTP is configured', async () => {
  await sendMail({ to: 'x@example.com', subject: 'Hi', text: 'code 123456' });
  expect(outbox).toHaveLength(1);
  expect(outbox[0].to).toBe('x@example.com');
  expect(outbox[0].text).toContain('123456');
});

test('email builders embed the 6-digit code', () => {
  expect(verificationEmail('482913').text).toContain('482913');
  expect(loginCodeEmail('482913').text).toContain('482913');
  expect(verificationEmail('482913').subject).toMatch(/verify/i);
  expect(loginCodeEmail('482913').subject).toMatch(/login/i);
});
