const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const MAGIC_NUMBERS = {
    'pdf': [0x25, 0x50, 0x44, 0x46],
    'png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'jpg': [0xFF, 0xD8, 0xFF],
    'jpeg': [0xFF, 0xD8, 0xFF]
};

async function verifyFileSignature(filePath) {
    try {
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        // If extension is not in our list, we might want to fail or warn. 
        // For this specific use case (receipts), we only allow pdf, png, jpg.
        const magic = MAGIC_NUMBERS[ext];
        if (!magic) {
             // If we don't have a magic number for it but it was allowed by extension filter, 
             // it's suspicious if we claimed to support it. 
             // But if we strictly only allow pdf/png/jpg, then this is correct.
             return { valid: false, reason: 'Unsupported file type signature check' };
        }

        const buffer = Buffer.alloc(magic.length);
        const fd = await fs.promises.open(filePath, 'r');
        await fd.read(buffer, 0, magic.length, 0);
        await fd.close();

        for (let i = 0; i < magic.length; i++) {
            if (buffer[i] !== magic[i]) {
                return { valid: false, reason: 'Invalid file signature (Magic Number mismatch)' };
            }
        }
        return { valid: true };
    } catch (e) {
        return { valid: false, reason: e.message };
    }
}

async function scanFile(filePath) {
  const mode = String(process.env.CLAMAV_MODE || '').toLowerCase();
  const host = process.env.CLAMAV_HOST || '';
  const port = parseInt(process.env.CLAMAV_PORT || '3310');
  const timeoutMs = parseInt(process.env.CLAMAV_TIMEOUT_MS || '5000');
  const clamscanPath = process.env.CLAMAV_CLAMSCAN_PATH || 'clamscan';
  if (host && !mode) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let result = '';
      let done = false;
      socket.setTimeout(timeoutMs, () => { if (!done) { done = true; socket.destroy(); resolve({ clean: true, reason: 'timeout' }); } });
      socket.connect(port, host, () => {
        socket.write('zINSTREAM\0');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => {
          const len = Buffer.alloc(4);
          len.writeUInt32BE(chunk.length, 0);
          socket.write(len);
          socket.write(chunk);
        });
        stream.on('end', () => { const end = Buffer.alloc(4); end.writeUInt32BE(0, 0); socket.write(end); });
      });
      socket.on('data', (data) => { result += data.toString(); });
      socket.on('error', () => { if (!done) { done = true; resolve({ clean: true, reason: 'error' }); } });
      socket.on('close', () => {
        if (!done) {
          done = true;
          const ok = /OK/i.test(result) && !/FOUND/i.test(result);
          resolve({ clean: !!ok, reason: result.trim() });
        }
      });
    });
  }
  if (mode === 'cli') {
    return new Promise((resolve) => {
      const p = spawn(clamscanPath, ['--no-summary', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      p.stdout.on('data', (d) => out += d.toString());
      p.stderr.on('data', (d) => err += d.toString());
      const to = setTimeout(() => { try { p.kill(); } catch {} }, timeoutMs);
      p.on('close', (code) => { clearTimeout(to); resolve({ clean: code === 0, reason: (out || err).trim() }); });
      p.on('error', () => { clearTimeout(to); resolve({ clean: true, reason: 'error' }); });
    });
  }
  return { clean: true, reason: 'disabled' };
}

module.exports = { verifyFileSignature, scanFile };
