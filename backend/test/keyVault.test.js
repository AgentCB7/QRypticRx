const { encryptPrivateKey, decryptPrivateKey } = require('../lib/keyVault');

test('encrypt then decrypt round-trips the PEM', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nABC123\n-----END PRIVATE KEY-----\n';
  const blob = encryptPrivateKey(pem);
  expect(blob).not.toContain('BEGIN PRIVATE KEY');
  expect(decryptPrivateKey(blob)).toBe(pem);
});

test('ciphertext differs each call (random IV)', () => {
  const pem = 'same-input';
  expect(encryptPrivateKey(pem)).not.toBe(encryptPrivateKey(pem));
});

test('tampered ciphertext fails authentication', () => {
  const blob = encryptPrivateKey('secret');
  const [iv, tag, data] = blob.split(':');
  const flipped = data.startsWith('A') ? 'B' + data.slice(1) : 'A' + data.slice(1);
  expect(() => decryptPrivateKey([iv, tag, flipped].join(':'))).toThrow();
});
