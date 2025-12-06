const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../middleware/auth')
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for payment proofs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'storage', 'payments');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', verifyToken, async (req, res) => {
  try {
    const { ModuleCatalog } = require('../models')
    const rows = await ModuleCatalog.findAll({ order: [['isCore','DESC'], ['name','ASC']] })
    if (rows && rows.length > 0) {
      const list = rows.map(r => ({ id: r.id, name: r.name, description: r.description, monthlyPrice: r.monthlyPrice, oneTimePrice: r.oneTimePrice || 0, currency: r.currency, isEnabled: !!r.isEnabled, isCore: !!r.isCore }))
      return res.json(list)
    }
    const catalog = Array.isArray(req.app?.locals?.modulesCatalog) ? req.app.locals.modulesCatalog : []
    const list = catalog.map(m => ({ id: m.id, name: m.name, description: m.description, monthlyPrice: Number(m.monthlyPrice) || 0, oneTimePrice: Number(m.oneTimePrice || 0), isEnabled: m.isEnabled !== false, isCore: !!m.isCore }))
    return res.json(list)
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ModuleCatalog } = require('../models')
    const p = req.body || {}
    if (!p.id || !p.name) return res.status(400).json({ message: 'id and name required' })
    const row = await ModuleCatalog.create({ id: String(p.id), name: String(p.name), description: String(p.description || ''), monthlyPrice: Number(p.monthlyPrice || 0), oneTimePrice: p.oneTimePrice ? Number(p.oneTimePrice) : null, annualPrice: p.annualPrice ? Number(p.annualPrice) : null, currency: String(p.currency || 'USD'), isEnabled: !!p.isEnabled, isCore: !!p.isCore })
    res.status(201).json({ id: row.id, name: row.name, description: row.description, monthlyPrice: row.monthlyPrice, oneTimePrice: row.oneTimePrice || 0, annualPrice: row.annualPrice, currency: row.currency, isEnabled: !!row.isEnabled, isCore: !!row.isCore })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.put('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ModuleCatalog } = require('../models')
    const id = String(req.params.id || '')
    const row = await ModuleCatalog.findByPk(id)
    if (!row) return res.status(404).json({ message: 'Module not found' })
  const p = req.body || {}
  row.name = String(p.name ?? row.name)
  row.description = String(p.description ?? row.description)
  row.monthlyPrice = Number(p.monthlyPrice ?? row.monthlyPrice)
  row.oneTimePrice = p.oneTimePrice === undefined ? row.oneTimePrice : Number(p.oneTimePrice)
  row.annualPrice = p.annualPrice === undefined ? row.annualPrice : Number(p.annualPrice)
  row.currency = String(p.currency ?? row.currency)
  row.isEnabled = p.isEnabled === undefined ? row.isEnabled : !!p.isEnabled
  row.isCore = p.isCore === undefined ? row.isCore : !!p.isCore
  await row.save()
  res.json({ id: row.id, name: row.name, description: row.description, monthlyPrice: row.monthlyPrice, oneTimePrice: row.oneTimePrice || 0, annualPrice: row.annualPrice, currency: row.currency, isEnabled: !!row.isEnabled, isCore: !!row.isCore })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ModuleCatalog } = require('../models')
    const id = String(req.params.id || '')
    const row = await ModuleCatalog.findByPk(id)
    if (!row) return res.status(404).json({ message: 'Module not found' })
    await row.destroy()
    res.json({ deleted: true })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

// Get school's active modules
router.get('/school/:schoolId', verifyToken, async (req, res) => {
  try {
    const { SchoolModule, ModuleCatalog } = require('../models');
    const { Op } = require('sequelize');
    const schoolId = req.params.schoolId;
    
    // Fetch relevant modules
    const schoolModules = await SchoolModule.findAll({
      where: { 
        schoolId: schoolId,
        status: { [Op.in]: ['ACTIVE', 'PENDING_PAYMENT', 'TRIAL'] }
      }
    });

    // Fetch all core modules
    const coreModules = await ModuleCatalog.findAll({
      where: { isCore: true, isEnabled: true }
    });

    const result = [];
    const seen = new Set();

    // Add school modules
    schoolModules.forEach(m => {
        result.push({ moduleId: m.moduleId, status: m.status });
        seen.add(m.moduleId);
    });

    // Add core modules
    coreModules.forEach(m => {
        if (!seen.has(m.id)) {
            result.push({ moduleId: m.id, status: 'ACTIVE' });
        }
    });

    res.json(result);
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
});

// Purchase/Activate a module for a school
router.post('/school/:schoolId/activate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), upload.single('proofImage'), async (req, res) => {
  try {
    const { SchoolModule, ModuleCatalog } = require('../models');
    const schoolId = req.params.schoolId;
    const { moduleId, paymentMethod, transactionReference } = req.body;

    if (!moduleId) return res.status(400).json({ message: 'Module ID required' });

    // Check if module exists
    const module = await ModuleCatalog.findByPk(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    // Check if already active or pending
    const existing = await SchoolModule.findOne({
      where: { schoolId, moduleId }
    });
    
    if (existing && existing.status === 'ACTIVE') {
        return res.status(400).json({ message: 'Module already active' });
    }
    
    if (existing && existing.status === 'PENDING_PAYMENT') {
        return res.status(400).json({ message: 'Activation request already pending' });
    }

    // Determine if payment is required
    const isPaid = module.monthlyPrice > 0 || module.oneTimePrice > 0;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

    let status = 'ACTIVE';
    // If it's paid and user is NOT super admin, it goes to pending
    if (isPaid && !isSuperAdmin) {
        status = 'PENDING_PAYMENT';
    }

    const data = {
      schoolId,
      moduleId,
      status,
      startDate: new Date(),
      expiryDate: module.monthlyPrice > 0 ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : null,
      paymentMethod: paymentMethod || null,
      transactionReference: transactionReference || null,
      paymentProofUrl: req.file ? `/storage/payments/${req.file.filename}` : null
    };

    if (existing) {
        await existing.update(data);
    } else {
        await SchoolModule.create(data);
    }

    res.json({ 
        success: true, 
        message: status === 'ACTIVE' ? 'Module activated successfully' : 'Activation request submitted. Waiting for approval.',
        status
    });

  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
});

// Get pending activation requests (Super Admin)
router.get('/requests/pending', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { SchoolModule, ModuleCatalog, School } = require('../models');
    const requests = await SchoolModule.findAll({
      where: { status: 'PENDING_PAYMENT' },
      include: [
        { model: School, attributes: ['id', 'name'] },
        { model: ModuleCatalog, attributes: ['id', 'name', 'monthlyPrice'] }
      ]
    });
    res.json(requests);
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// Approve request
router.post('/requests/:id/approve', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { SchoolModule, ModuleCatalog } = require('../models');
    const request = await SchoolModule.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    request.status = 'ACTIVE';
    request.startDate = new Date();
    
    const module = await ModuleCatalog.findByPk(request.moduleId);
    if (module && module.monthlyPrice > 0) {
        request.expiryDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
    }
    
    await request.save();
    res.json({ success: true, message: 'Request approved' });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// Reject request
router.post('/requests/:id/reject', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { SchoolModule } = require('../models');
    const request = await SchoolModule.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    request.status = 'REJECTED';
    await request.save();
    res.json({ success: true, message: 'Request rejected' });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});


module.exports = router
