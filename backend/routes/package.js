const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const archiver = require('archiver');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { verifyToken, requireRole } = require('../middleware/auth');
const { signLicense, verifyLicenseKey } = require('../utils/license');

const ROOT = path.resolve(__dirname, '..', '..');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

// Simple in-memory token store to enforce one-time, time-limited downloads
const tokenStore = new Map(); // token -> expiresAt (ms)

function modulePaths(moduleIds) {
  const paths = [];
  // Core Backend
  paths.push('backend');
  
  // Frontend: Use pre-built artifacts if available, otherwise source
  const distPath = path.join(ROOT, 'admin', 'dist');
  if (fs.existsSync(distPath)) {
      paths.push('admin/dist'); // Only copy dist
      paths.push('admin/package.json'); // Needed for some metadata, but dependencies won't be installed for frontend
  } else {
      paths.push('admin'); // Fallback to source
  }
  
  // Root configuration files
  paths.push('package.json');
  
  return Array.from(new Set(paths));
}

async function obfuscateFile(filePath) {
    try {
        const code = await fs.promises.readFile(filePath, 'utf8');
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: false, // Avoid breaking if user opens devtools
            debugProtectionInterval: 0,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false,
            selfDefending: true, // Make code harder to tamper
            simplify: true,
            splitStrings: true,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['base64', 'rc4'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'variable',
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false
        });
        await fs.promises.writeFile(filePath, obfuscationResult.getObfuscatedCode());
    } catch (e) {
        console.warn(`Obfuscation failed for ${filePath}:`, e.message);
    }
}

async function copyPaths(stagingDir, relPaths) {
  for (const rel of relPaths) {
    const src = path.join(ROOT, rel);
    const dest = path.join(stagingDir, rel);
    
    if (fs.existsSync(src)) {
        await fse.ensureDir(path.dirname(dest));
        await fse.copy(src, dest, { 
            filter: (srcPath) => {
                const base = path.basename(srcPath);
                return !base.includes('node_modules') && 
                       !base.includes('.git') && 
                       !base.includes('.env') && 
                       !base.includes('uploads') && 
                       // Exclude src if we are copying admin/dist (handled by modulePaths check logic essentially)
                       // But if we are copying 'admin', we might want to exclude 'src' if 'dist' exists inside it?
                       // The modulePaths logic handles the root level choice.
                       !base.includes('logs');
            } 
        });
    }
  }
}

async function protectBackend(stagingDir) {
    const backendDir = path.join(stagingDir, 'backend');
    if (!fs.existsSync(backendDir)) return;

    // Files to obfuscate (Critical logic)
    const filesToProtect = [
        'server.js',
        'middleware/auth.js',
        'utils/license.js',
        'routes/license.js',
        'routes/auth.js'
    ];

    for (const f of filesToProtect) {
        const p = path.join(backendDir, f);
        if (fs.existsSync(p)) {
            await obfuscateFile(p);
        }
    }
}

function createSetupScript(stagingDir) {
    const hasDist = fs.existsSync(path.join(stagingDir, 'admin', 'dist'));
    
    const scriptContent = `#!/bin/bash
echo "Setting up SchoolSaaS Self-Hosted..."

# 1. Install Backend Dependencies
echo "Installing Backend Dependencies..."
cd backend
npm install --production
cd ..

${hasDist ? '' : `# 2. Install Frontend Dependencies (Source Version)
echo "Installing Frontend Dependencies..."
cd admin
npm install
echo "Building Frontend..."
npm run build
cd ..
`}

# 3. Create Environment File
if [ ! -f backend/.env ]; then
    echo "Creating .env file..."
    cp backend/.env.example backend/.env 2>/dev/null || echo "Please configure backend/.env manually."
fi

echo "Setup Complete!"
echo "To start the server: cd backend && npm start"
`;
    fs.writeFileSync(path.join(stagingDir, 'setup.sh'), scriptContent, { mode: 0o755 });

    const readmeContent = `
# SchoolSaaS Self-Hosted Edition

## Installation

1.  Ensure Node.js (v16+) and PostgreSQL are installed.
2.  Run \`./setup.sh\` to install dependencies.
3.  Configure your database connection in \`backend/.env\`.
    *   Ensure \`LICENSE_KEY\` is set to the key provided.
4.  Start the server with \`cd backend && npm start\`.

## License

This copy is licensed to the specific entity named in the license key.
Redistribution is strictly prohibited.
Code is protected and obfuscated.
    `;
    fs.writeFileSync(path.join(stagingDir, 'README.txt'), readmeContent);
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

router.post('/self-hosted/package', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { moduleIds = [], planId = null } = req.body || {};
    await fse.ensureDir(UPLOADS_DIR);
    
    const ts = Date.now();
    const stagingDir = path.join(UPLOADS_DIR, `staging_${ts}`);
    await fse.ensureDir(stagingDir);
    
    // 1. Copy Files
    const ids = Array.isArray(moduleIds) ? moduleIds : [];
    const pathsToCopy = modulePaths(ids);
    await copyPaths(stagingDir, pathsToCopy);
    
    // 2. Protect Code (Obfuscation)
    await protectBackend(stagingDir);

    // 3. Add Helper Scripts
    createSetupScript(stagingDir);
    
    // 4. Zip
    const zipName = `schoolsaas_pkg_${ts}.zip`;
    const zipPath = path.join(UPLOADS_DIR, zipName);
    await zipDirectory(stagingDir, zipPath);
    
    // 5. Cleanup Staging
    await fse.remove(stagingDir);
    
    // 6. Generate One-Time Token
    const downloadToken = signLicense({ 
        file: zipName, 
        type: 'download_token',
        issuedAt: new Date().toISOString(), 
        expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString() 
    });
    
    tokenStore.set(downloadToken, Date.now() + 24*60*60*1000);
    
    res.json({ downloadUrl: `/superadmin/download/${encodeURIComponent(downloadToken)}` });
    
  } catch (e) {
    console.error('Package generation failed:', e);
    res.status(500).json({ msg: 'Failed to generate package' });
  }
});

router.get('/download/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const exp = tokenStore.get(token);
    if (!exp || exp < Date.now()) {
        return res.status(403).json({ msg: 'Download link expired or invalid' });
    }
    const result = verifyLicenseKey(token);
    if (!result.valid || result.payload.type !== 'download_token') {
        return res.status(403).json({ msg: 'Invalid token' });
    }
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
