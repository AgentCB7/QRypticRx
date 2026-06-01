const { scryptSync, randomBytes, createCipheriv, createDecipheriv } = require('crypto');

const SALT = 'qrypticrx-keyvault-v1';

function getKey() {
  const secret = process.env.KEY_SECRET;
  if (!secret) throw new Error('KEY_SECRET is not set');
  return scryptSync(secret, SALT, 32);
}

function encryptPrivateKey(pem) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(pem, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

function decryptPrivateKey(blob) {
  const [ivB64, tagB64, dataB64] = blob.split(':');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encryptPrivateKey, decryptPrivateKey };
