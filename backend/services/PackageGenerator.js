
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { signLicense } = require('../utils/license');

/**
 * Service to generate a secure, self-hosted package
 */
class PackageGenerator {

    /**
     * Generates a zip package with a signed license key
     * @param {Object} options - { schoolName, contactEmail, modules, domain }
     * @returns {Promise<string>} - Path to the generated zip file
     */
    static async generate(options) {
        return new Promise((resolve, reject) => {
            const { schoolName, contactEmail, modules, domain } = options;

            // 1. Generate License Key
            const licensePayload = {
                schoolName,
                contactEmail,
                modules,
                domain,
                type: 'SELF_HOSTED',
                issuedAt: new Date().toISOString()
            };
            const licenseKey = signLicense(licensePayload);
            const licenseData = {
                key: licenseKey,
                owner: schoolName,
                modules: modules || [],
                generatedAt: new Date().toISOString()
            };

            // 2. Prepare Output
            const fileName = `school-crm-selfhosted-${Date.now()}.zip`;
            const uploadDir = path.join(__dirname, '..', '..', 'admin', 'public', 'downloads');

            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const outputPath = path.join(uploadDir, fileName);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', function () {
                console.log(archive.pointer() + ' total bytes');
                resolve(`/downloads/${fileName}`);
            });

            archive.on('error', function (err) {
                reject(err);
            });

            archive.pipe(output);

            // 3. Add Real Application Source Code

            // Backend (excluding sensitive or heavy files)
            // Fix path: __dirname is backend/services. .. is backend.
            const backendPath = path.join(__dirname, '..');
            archive.glob('**/*', {
                cwd: backendPath,
                ignore: ['node_modules/**', '.env', '.env.*', 'uploads/**', '.git/**', '.vscode/**', 'dev.sqlite']
            }, { prefix: 'backend' });

            // Admin/Frontend
            // Fix path: __dirname is backend/services. ../.. is root. root/admin.
            const adminPath = path.join(__dirname, '..', '..', 'admin');
            archive.glob('**/*', {
                cwd: adminPath,
                ignore: ['node_modules/**', 'dist/**', '.git/**', '.vscode/**']
            }, { prefix: 'admin' });

            // 4. Add Configuration Templates
            // Create a default .env.example if one doesn't exist explicitly for distro
            const envTemplate = `
PORT=5000
NODE_ENV=production
DB_DIALECT=sqlite
# For production use: DB_DIALECT=mysql, DB_HOST=..., DB_USER=...
JWT_SECRET=CHANGE_THIS_SECRET
LICENSE_SECRET=${process.env.LICENSE_SECRET || 'MustMatchGeneratedKey'}
# Frontend URL
CORS_ORIGIN=http://localhost:3000
            `;
            archive.append(envTemplate.trim(), { name: 'backend/.env.example' });

            // 5. Add License File (CRITICAL)
            const licenseString = JSON.stringify(licenseData, null, 2);
            archive.append(licenseString, { name: 'license.json' });
            // Also place inside backend for the server check
            archive.append(licenseString, { name: 'backend/license.json' });

            // 6. Comprehensive README
            const readmeContent = `
# School CRM - Self Hosted Edition
Licensed to: ${schoolName}

## Security Warning
This copy is protected by a cryptographic license file (\`license.json\`). 
Do not modify this file or the system will fail to start.

## Installation Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   cd backend
2. Install dependencies:
   npm install
3. Configure Environment:
   Copy .env.example to .env
   cp .env.example .env
   Edit .env and set your database credentials.
4. Start the Server:
   npm start

### 2. Frontend Setup (Admin Panel)
1. Open a new terminal and navigate to the admin folder:
   cd admin
2. Install dependencies:
   npm install
3. Build the frontend:
   npm run build
4. Serve the frontend (or configure your web server to serve the 'dist' folder).

## Support
For support, please contact support@schoolcrm.com
            `;
            archive.append(readmeContent, { name: 'README.md' });

            archive.finalize();
        });
    }
}

module.exports = PackageGenerator;
