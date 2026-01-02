const crypto = require('crypto');

const LICENSE_SECRET = process.env.LICENSE_SECRET || (() => {
  console.error('❌ LICENSE_SECRET not found in environment variables!');
  console.error('Please set LICENSE_SECRET in your .env file');
  process.exit(1);
})();

function signLicense(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', LICENSE_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyLicenseKey(licenseKey) {
  try {
    const [data, sig] = String(licenseKey).split('.');
    if (!data || !sig) return { valid: false, reason: 'Malformed' };
    const expected = crypto.createHmac('sha256', LICENSE_SECRET).update(data).digest('base64url');
    if (expected !== sig) return { valid: false, reason: 'Signature mismatch' };
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) return { valid: false, reason: 'Expired' };
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'Error' };
  }
}

module.exports = { signLicense, verifyLicenseKey };