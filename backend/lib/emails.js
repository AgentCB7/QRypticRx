function baseTemplate(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2e86c1 0%,#16213e 60%,#2e86c1 100%);padding:30px 40px;text-align:center;">
              <div style="font-size:25px;font-weight:700;letter-spacing:2px;color:#ffffff;">
                QRyptic<span style="color:#e94560;">Rx</span>
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">
                Secure E-Prescription System
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:30px 40px 30px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fb;padding:20px 40px;text-align:center;border-top:1px solid #eef0f3;">
              <p style="margin:0;font-size:12px;color:#9aa0aa;">
                This email was sent by QRypticRx. If you didn't request this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlock(code) {
  return `<div style="text-align:center;margin:28px 0;">
    <div style="display:inline-block;background:#f4f6f9;border:2px dashed #d0d4dc;border-radius:10px;padding:18px 40px;">
      <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1a1a2e;font-family:'Courier New',monospace;">${code}</span>
    </div>
    <p style="margin:12px 0 0;font-size:13px;color:#9aa0aa;">Expires in <strong>10 minutes</strong></p>
  </div>`;
}

function verificationEmail(code) {
  const html = baseTemplate('Verify your email', `
    <h2 style="margin:0 0 10px;font-size:20px;color:#1a1a2e;">Verify your email address</h2>
    <p style="margin:0 0 4px;font-size:15px;color:#555e6d;line-height:1.6;">
      Thanks for registering with QRypticRx. Use the code below to verify your email address and complete your registration.
    </p>
    ${codeBlock(code)}
    <p style="margin:0;font-size:13px;color:#9aa0aa;line-height:1.6;">
      Once verified, your account will be reviewed by an administrator before you can log in.
    </p>
  `);

  return {
    subject: 'Verify your QRypticRx email',
    text: `Your QRypticRx verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html,
  };
}

function loginCodeEmail(code) {
  const html = baseTemplate('Your login code', `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a2e;">Your login code</h2>
    <p style="margin:0 0 4px;font-size:15px;color:#555e6d;line-height:1.6;">
      Use the code below to complete your sign-in to QRypticRx.
    </p>
    ${codeBlock(code)}
    <p style="margin:0;font-size:13px;color:#9aa0aa;line-height:1.6;">
      If you didn't try to log in, your password may be compromised — consider changing it immediately.
    </p>
  `);

  return {
    subject: 'Your QRypticRx login code',
    text: `Your QRypticRx login code is ${code}. It expires in 10 minutes. If you did not try to log in, change your password.`,
    html,
  };
}

module.exports = { verificationEmail, loginCodeEmail };
