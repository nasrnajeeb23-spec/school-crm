const express = require('express');
const router = express.Router();
const { Conversation, Message } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const net = require('net');
const { spawn } = require('child_process');
const multer = require('multer');
const allowedMimes = new Set(['image/png','image/jpeg','application/pdf']);
const allowedExts = new Set(['.png','.jpg','.jpeg','.pdf']);
const tmpDir = path.join(__dirname, '..', 'storage', 'tmp');
fse.ensureDirSync(tmpDir);
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!allowedMimes.has(file.mimetype) || !allowedExts.has(ext)) return cb(new Error('Invalid file type'));
      cb(null, true);
    } catch (e) { cb(new Error('Invalid file')); }
  }
});

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

router.get('/', (req, res) => res.json({ ok: true, msg: 'messaging routes alive' }));

router.post('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, schoolId, parentId, teacherId } = req.body || {};
    if (!title || !schoolId) return res.status(400).json({ msg: 'title and schoolId are required' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(req.user.schoolId || 0) !== Number(schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const id = `conv_${Date.now()}`;
    const roomId = `room_${Date.now()}`;
    const payload = { id, roomId, title: String(title), schoolId: Number(schoolId) };
    if (parentId) payload.parentId = parentId;
    if (teacherId) payload.teacherId = teacherId;
    const conv = await Conversation.create(payload);
    res.status(201).json({ id: conv.id, roomId: conv.roomId, title: conv.title });
  } catch (e) { res.status(500).send('Server Error'); }
});

router.get('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const { schoolId } = req.query;
    const where = {};
    if (req.user.role === 'SUPER_ADMIN') {
      if (schoolId) where.schoolId = Number(schoolId);
    } else {
      where.schoolId = Number(req.user.schoolId || 0);
    }
    if (req.user.role === 'TEACHER') where.teacherId = req.user.teacherId;
    if (req.user.role === 'PARENT') where.parentId = req.user.parentId;
    const convs = await Conversation.findAll({ where, order: [['updatedAt','DESC']] });
    res.json(convs.map(c => ({ id: c.id, roomId: c.roomId, title: c.title })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.get('/conversations/:conversationId/messages', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const conv = await Conversation.findByPk(req.params.conversationId);
    if (!conv) return res.status(404).json({ msg: 'Conversation not found' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(conv.schoolId || 0) !== Number(req.user.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    const msgs = await Message.findAll({ where: { conversationId: req.params.conversationId }, order: [['createdAt','ASC']] });
    res.json(msgs.map(m => ({ id: m.id, text: m.text, senderId: m.senderId, senderRole: m.senderRole, timestamp: m.createdAt })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, schoolId, teacherId, parentId } = req.body || {};
    if (!title || !schoolId || (!teacherId && !parentId)) return res.status(400).json({ msg: 'Invalid payload' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(req.user.schoolId || 0) !== Number(schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const conv = await Conversation.create({ id: `conv_${Date.now()}`, roomId: `room_${Date.now()}`, title, schoolId, teacherId: teacherId || null, parentId: parentId || null });
    res.status(201).json({ id: conv.id, roomId: conv.roomId, title: conv.title });
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/upload', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file' });
    const schoolId = Number(req.body?.schoolId || req.query?.schoolId || req.user?.schoolId || 0);
    if (req.user.role !== 'SUPER_ADMIN' && (!schoolId || Number(req.user.schoolId || 0) !== schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const base = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_.-]/g,'_');
    const safeName = `${Date.now()}_${base}${ext}`;
    const targetDir = path.join(__dirname, '..', 'storage', 'chat', String(schoolId));
    await fse.ensureDir(targetDir);
    const targetPath = path.join(targetDir, safeName);
    const scan = await scanFile(req.file.path);
    if (!scan.clean) { try { await fse.remove(req.file.path); } catch {} return res.status(400).json({ msg: 'Malware detected' }); }
    await fse.move(req.file.path, targetPath, { overwrite: true });
    const url = `/api/messaging/attachments/${schoolId}/${safeName}`;
    res.json({ url, name: req.file.originalname, type: ext });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Send a message within a conversation
router.post('/send', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const { conversationId, text, attachmentUrl, attachmentType, attachmentName } = req.body || {};
    if (!conversationId || !text) return res.status(400).json({ msg: 'conversationId and text are required' });

    const conv = await Conversation.findByPk(conversationId);
    if (!conv) return res.status(404).json({ msg: 'Conversation not found' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(conv.schoolId || 0) !== Number(req.user.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    if (req.user.role === 'TEACHER' && conv.teacherId && String(req.user.teacherId) !== String(conv.teacherId)) return res.status(403).json({ msg: 'Access denied' });
    if (req.user.role === 'PARENT' && conv.parentId && String(req.user.parentId) !== String(conv.parentId)) return res.status(403).json({ msg: 'Access denied' });

    const roleMap = {
      'SuperAdmin': 'SUPER_ADMIN',
      'SchoolAdmin': 'SCHOOL_ADMIN',
      'Teacher': 'TEACHER',
      'Parent': 'PARENT'
    };
    const senderRole = roleMap[req.user.role] || 'SCHOOL_ADMIN';

    const msg = await Message.create({
      id: `msg_${Date.now()}`,
      text: String(text),
      senderId: String(req.user.id),
      senderRole,
      conversationId,
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      attachmentName: attachmentName || null,
    });

    try { await conv.update({ updatedAt: new Date() }); } catch {}

    return res.status(201).json({
      id: msg.id,
      text: msg.text,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      timestamp: msg.createdAt,
      attachmentUrl: msg.attachmentUrl,
      attachmentType: msg.attachmentType,
      attachmentName: msg.attachmentName,
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).send('Server Error');
  }
});

router.get('/attachments/:schoolId/:filename', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    if (req.user.role !== 'SUPER_ADMIN' && Number(req.user.schoolId || 0) !== schoolId) return res.status(403).json({ msg: 'Access denied' });
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, '..', 'storage', 'chat', String(schoolId), filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.type(path.extname(filename));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.status(500).send('Server Error'); }
});

module.exports = router;
