function verificationEmail(code) {
  return {
    subject: 'Verify your QRypticRx email',
    text: `Your QRypticRx verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  };
}

function loginCodeEmail(code) {
  return {
    subject: 'Your QRypticRx login code',
    text: `Your QRypticRx login code is ${code}. It expires in 10 minutes. If you did not try to log in, change your password.`,
  };
}

module.exports = { verificationEmail, loginCodeEmail };
