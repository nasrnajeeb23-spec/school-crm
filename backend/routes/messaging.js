const express = require('express');
const router = express.Router();
const { Conversation, Message } = require('../models');
const { verifyToken, requireRole, isSuperAdminUser, normalizeUserRole, canAccessSchool } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const net = require('net');
const { spawn } = require('child_process');
const multer = require('multer');
const { scanFile, verifyFileSignature } = require('../utils/fileSecurity');
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

router.get('/', (req, res) => res.json({ ok: true, msg: 'messaging routes alive' }));

router.post('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, schoolId, parentId, teacherId } = req.body || {};
    if (!title || !schoolId) return res.status(400).json({ msg: 'title and schoolId are required' });
    if (!canAccessSchool(req.user, schoolId)) return res.status(403).json({ msg: 'Access denied' });
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
    const userRole = normalizeUserRole(req.user);
    const where = {};
    if (isSuperAdminUser(req.user)) {
      if (schoolId) where.schoolId = Number(schoolId);
    } else {
      where.schoolId = Number(req.user.schoolId || 0);
    }
    if (userRole === 'TEACHER') where.teacherId = req.user.teacherId;
    if (userRole === 'PARENT') where.parentId = req.user.parentId;
    const convs = await Conversation.findAll({ where, order: [['updatedAt','DESC']] });
    res.json(convs.map(c => ({ id: c.id, roomId: c.roomId, title: c.title })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.get('/conversations/:conversationId/messages', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const conv = await Conversation.findByPk(req.params.conversationId);
    if (!conv) return res.status(404).json({ msg: 'Conversation not found' });
    if (!canAccessSchool(req.user, conv.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const msgs = await Message.findAll({ where: { conversationId: req.params.conversationId }, order: [['createdAt','ASC']] });
    res.json(msgs.map(m => ({ id: m.id, text: m.text, senderId: m.senderId, senderRole: m.senderRole, timestamp: m.createdAt })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, schoolId, teacherId, parentId } = req.body || {};
    if (!title || !schoolId || (!teacherId && !parentId)) return res.error(400, 'VALIDATION_FAILED', 'Invalid payload');
    if (!canAccessSchool(req.user, schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const conv = await Conversation.create({ id: `conv_${Date.now()}`, roomId: `room_${Date.now()}`, title, schoolId, teacherId: teacherId || null, parentId: parentId || null });
    return res.success({ id: conv.id, roomId: conv.roomId, title: conv.title }, 'Conversation created', 'CREATED');
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/upload', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file' });
    const schoolId = Number(req.body?.schoolId || req.query?.schoolId || req.user?.schoolId || 0);
    if (!canAccessSchool(req.user, schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const base = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_.-]/g,'_');
    const safeName = `${Date.now()}_${base}${ext}`;
    const targetDir = path.join(__dirname, '..', 'storage', 'chat', String(schoolId));
    await fse.ensureDir(targetDir);
    const targetPath = path.join(targetDir, safeName);

    // Verify File Signature (Magic Numbers)
    const sig = await verifyFileSignature(req.file.path);
    if (!sig.valid) {
        try { await fse.remove(req.file.path); } catch {}
        return res.status(400).json({ msg: 'Invalid file signature: ' + sig.reason });
    }

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
    if (!conversationId || !text) return res.error(400, 'VALIDATION_FAILED', 'conversationId and text are required');

    const conv = await Conversation.findByPk(conversationId);
    if (!conv) return res.error(404, 'NOT_FOUND', 'Conversation not found');
    const userRole = normalizeUserRole(req.user);
    if (!canAccessSchool(req.user, conv.schoolId)) return res.status(403).json({ msg: 'Access denied' });
    if (userRole === 'TEACHER' && conv.teacherId && String(req.user.teacherId) !== String(conv.teacherId)) return res.status(403).json({ msg: 'Access denied' });
    if (userRole === 'PARENT' && conv.parentId && String(req.user.parentId) !== String(conv.parentId)) return res.status(403).json({ msg: 'Access denied' });

    const senderRole = userRole || 'SCHOOL_ADMIN';

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

    const responseData = {
      id: msg.id,
      conversationId,
      text: msg.text,
      senderId: msg.senderId,
      senderRole: msg.senderRole,
      timestamp: msg.createdAt,
      attachmentUrl: msg.attachmentUrl,
      attachmentType: msg.attachmentType,
      attachmentName: msg.attachmentName,
    };

    const io = req.app.get('io');
    if (io) {
      io.to(conv.roomId).emit('receive_message', responseData);
    }

    return res.success(responseData, 'Message sent', 'CREATED');
  } catch (e) {
    console.error(e.message);
    res.status(500).send('Server Error');
  }
});

router.get('/attachments/:schoolId/:filename', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    if (!canAccessSchool(req.user, schoolId)) return res.status(403).json({ msg: 'Access denied' });
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, '..', 'storage', 'chat', String(schoolId), filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    res.setHeader('Content-Disposition', `inline; filename=${filename}`);
    res.type(path.extname(filename));
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.status(500).send('Server Error'); }
});

module.exports = router;
