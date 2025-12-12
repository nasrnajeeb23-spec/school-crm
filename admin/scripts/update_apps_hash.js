const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const appsJsonPath = path.join(__dirname, '../public/assets/apps.json');
const androidAppsDir = path.join(__dirname, '../public/apps/android');

function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            resolve(null);
            return;
        }
        const hash = crypto.createHash('sha256');
        const input = fs.createReadStream(filePath);
        input.on('readable', () => {
            const data = input.read();
            if (data) hash.update(data);
            else resolve(hash.digest('hex'));
        });
        input.on('error', reject);
    });
}

async function updateHashes() {
    console.log('Updating app hashes...');
    
    let appsConfig = {};
    if (fs.existsSync(appsJsonPath)) {
        appsConfig = JSON.parse(fs.readFileSync(appsJsonPath, 'utf8'));
    }

    const parentApkPath = path.join(androidAppsDir, 'parent.apk');
    const teacherApkPath = path.join(androidAppsDir, 'teacher.apk');

    const parentHash = await getFileHash(parentApkPath);
    const teacherHash = await getFileHash(teacherApkPath);

    if (parentHash) {
        if (!appsConfig.parent) appsConfig.parent = { label: 'release', apkUrl: '/apps/android/parent.apk' };
        appsConfig.parent.sha256 = parentHash;
        console.log(`Parent App Hash: ${parentHash}`);
    } else {
        console.warn('Parent APK not found!');
    }

    if (teacherHash) {
        if (!appsConfig.teacher) appsConfig.teacher = { label: 'release', apkUrl: '/apps/android/teacher.apk' };
        appsConfig.teacher.sha256 = teacherHash;
        console.log(`Teacher App Hash: ${teacherHash}`);
    } else {
        console.warn('Teacher APK not found!');
    }

    fs.writeFileSync(appsJsonPath, JSON.stringify(appsConfig, null, 2));
    console.log('Updated apps.json successfully.');
}

updateHashes().catch(console.error);
