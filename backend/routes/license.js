const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { signLicense, verifyLicenseKey } = require('../utils/license');

router.post('/generate', verifyToken, requireRole('SUPER_ADMIN'), (req, res) => {
  const { schoolName, modules, planId, planName, domain, expiresAt } = req.body || {};
  if (!schoolName) {
    return res.status(400).json({ msg: 'Invalid payload' });
  }
  const payload = {
    schoolName,
    modules: Array.isArray(modules) ? modules : [],
    planId: planId || null,
    planName: planName || null,
    domain: domain || null,
    issuedAt: new Date().toISOString(),
    expiresAt: expiresAt || null
  };
  const licenseKey = signLicense(payload);
  res.json({ licenseKey, payload });
});

router.post('/verify', (req, res) => {
  const { licenseKey } = req.body || {};
  if (!licenseKey) return res.status(400).json({ valid: false, reason: 'Missing licenseKey' });
  const result = verifyLicenseKey(licenseKey);
  res.json(result);
});

module.exports = router;
