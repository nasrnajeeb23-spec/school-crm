const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../middleware/auth')

router.get('/config', verifyToken, async (req, res) => {
  try {
    const { PricingConfig } = require('../models')
    const row = await PricingConfig.findOne({ where: { id: 'default' } })
    const cfg = row ? {
      pricePerStudent: row.pricePerStudent,
      pricePerTeacher: row.pricePerTeacher,
      pricePerGBStorage: row.pricePerGBStorage,
      pricePerInvoice: row.pricePerInvoice,
      currency: row.currency
    } : {
      pricePerStudent: 1.5,
      pricePerTeacher: 2.0,
      pricePerGBStorage: 0.2,
      pricePerInvoice: 0.05,
      currency: 'USD'
    }
    res.json(cfg)
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.put('/config', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { PricingConfig } = require('../models')
    const p = req.body || {}
    const pricePerStudent = Number(p.pricePerStudent ?? 1.5)
    const pricePerTeacher = Number(p.pricePerTeacher ?? 2.0)
    const pricePerGBStorage = Number(p.pricePerGBStorage ?? 0.2)
    const pricePerInvoice = Number(p.pricePerInvoice ?? 0.05)
    const currency = String(p.currency ?? 'USD')
    const [row] = await PricingConfig.findOrCreate({ where: { id: 'default' }, defaults: { id: 'default', pricePerStudent, pricePerTeacher, pricePerGBStorage, pricePerInvoice, currency } })
    row.pricePerStudent = pricePerStudent
    row.pricePerTeacher = pricePerTeacher
    row.pricePerGBStorage = pricePerGBStorage
    row.pricePerInvoice = pricePerInvoice
    row.currency = currency
    await row.save()
    res.json({ pricePerStudent: row.pricePerStudent, pricePerTeacher: row.pricePerTeacher, pricePerGBStorage: row.pricePerGBStorage, pricePerInvoice: row.pricePerInvoice, currency: row.currency })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

module.exports = router
