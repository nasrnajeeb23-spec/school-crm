const express = require('express');
const router = express.Router();
const { Conversation, Message } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads', 'chat') });

router.get('/', (req, res) => res.json({ ok: true, msg: 'messaging routes alive' }));

router.post('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, schoolId, parentId, teacherId } = req.body || {};
    if (!title || !schoolId) return res.status(400).json({ msg: 'title and schoolId are required' });
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
    if (schoolId) where.schoolId = Number(schoolId);
    if (req.user.role === 'TEACHER') where.teacherId = req.user.teacherId;
    if (req.user.role === 'PARENT') where.parentId = req.user.parentId;
    const convs = await Conversation.findAll({ where, order: [['updatedAt','DESC']] });
    res.json(convs.map(c => ({ id: c.id, roomId: c.roomId, title: c.title })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.get('/conversations/:conversationId/messages', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    const msgs = await Message.findAll({ where: { conversationId: req.params.conversationId }, order: [['createdAt','ASC']] });
    res.json(msgs.map(m => ({ id: m.id, text: m.text, senderId: m.senderId, senderRole: m.senderRole, timestamp: m.createdAt })));
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/conversations', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { title, schoolId, teacherId, parentId } = req.body || {};
    if (!title || !schoolId || (!teacherId && !parentId)) return res.status(400).json({ msg: 'Invalid payload' });
    const conv = await Conversation.create({ id: `conv_${Date.now()}`, roomId: `room_${Date.now()}`, title, schoolId, teacherId: teacherId || null, parentId: parentId || null });
    res.status(201).json({ id: conv.id, roomId: conv.roomId, title: conv.title });
  } catch (e) { res.status(500).send('Server Error'); }
});

router.post('/upload', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
    const targetDir = path.join(__dirname, '..', 'uploads', 'chat');
    await fse.ensureDir(targetDir);
    const targetPath = path.join(targetDir, safeName);
    await fse.move(req.file.path, targetPath, { overwrite: true });
    const url = `/uploads/chat/${safeName}`;
    res.json({ url, name: req.file.originalname, type: ext });
  } catch (e) { res.status(500).send('Server Error'); }
});

module.exports = router;