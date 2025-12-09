const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const archiver = require('archiver');
const { verifyToken, requireRole } = require('../middleware/auth');
const { signLicense, verifyLicenseKey } = require('../utils/license');

const ROOT = path.resolve(__dirname, '..', '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

// Simple in-memory token store to enforce one-time, time-limited downloads
const tokenStore = new Map(); // token -> expiresAt (ms)

function modulePaths(moduleIds) {
  const paths = [];
  // Always include core code
  paths.push('backend');
  paths.push('admin');
  // Optional: include transportation specifics when chosen
  if (moduleIds.includes('transportation')) {
    paths.push('backend/routes/transportation.js');
    paths.push('backend/models/BusOperator.js');
    paths.push('backend/models/Route.js');
    paths.push('backend/models/RouteStudent.js');
    paths.push('admin/src/pages/Transportation.tsx');
    paths.push('admin/src/components/AddRouteModal.tsx');
    paths.push('admin/src/components/EditRouteStudentsModal.tsx');
  }
  if (moduleIds.includes('finance')) {
    paths.push('admin/src/pages/Finance.tsx');
    paths.push('backend/routes/schoolAdmin.js');
    paths.push('backend/routes/payments.js');
  }
  return Array.from(new Set(paths));
}

async function copyPaths(stagingDir, relPaths) {
  for (const rel of relPaths) {
    const src = path.join(ROOT, rel);
    const dest = path.join(stagingDir, rel);
    await fse.ensureDir(path.dirname(dest));
    await fse.copy(src, dest, { filter: (srcPath) => !srcPath.includes('node_modules') && !srcPath.includes('.git') });
  }
}

async function zipDirectory(stagingDir, zipPath) {
  await fse.ensureDir(path.dirname(zipPath));
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(stagingDir, false);
    archive.finalize();
  });
}

router.post('/generate-package', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { moduleIds = [], planId = null } = req.body || {};
    await fse.ensureDir(UPLOADS_DIR);
    const ts = Date.now();
    const stagingDir = path.join(UPLOADS_DIR, `staging_${ts}`);
    await fse.ensureDir(stagingDir);
    const ids = Array.isArray(moduleIds) ? moduleIds : [];
    const pathsToCopy = modulePaths(ids);
    await copyPaths(stagingDir, pathsToCopy);
    const zipName = `schoolsaas_selfhosted_${ts}.zip`;
    const zipPath = path.join(UPLOADS_DIR, zipName);
    await zipDirectory(stagingDir, zipPath);
    await fse.remove(stagingDir);
    const token = signLicense({ file: zipName, planId: planId || null, issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString() });
    tokenStore.set(token, Date.now() + 24*60*60*1000);
    res.json({ downloadUrl: `/api/superadmin/download/${encodeURIComponent(token)}` });
  } catch (e) {
    console.error('Package generation failed:', e);
    res.status(500).json({ msg: 'Failed to generate package' });
  }
});

router.get('/download/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = verifyLicenseKey(token);
    if (!result.valid) return res.status(403).json({ msg: 'Invalid or expired token' });
    const exp = tokenStore.get(token);
    if (!exp || exp < Date.now()) return res.status(403).json({ msg: 'Download link expired' });
    // Consume token for one-time download
    tokenStore.delete(token);
    const filePath = path.join(UPLOADS_DIR, result.payload.file);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).json({ msg: 'Download failed' });
  }
});

module.exports = router;
