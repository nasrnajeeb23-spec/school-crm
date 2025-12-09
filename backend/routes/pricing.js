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
      currency: row.currency,
      yearlyDiscountPercent: row.yearlyDiscountPercent
    } : {
      pricePerStudent: 1.5,
      pricePerTeacher: 2.0,
      pricePerGBStorage: 0.2,
      pricePerInvoice: 0.05,
      currency: 'USD',
      yearlyDiscountPercent: 0
    }
    res.json(cfg)
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.get('/public/config', async (req, res) => {
  try {
    const { PricingConfig } = require('../models')
    const row = await PricingConfig.findOne({ where: { id: 'default' } })
    const cfg = row ? {
      pricePerStudent: row.pricePerStudent,
      pricePerTeacher: row.pricePerTeacher,
      pricePerGBStorage: row.pricePerGBStorage,
      pricePerInvoice: row.pricePerInvoice,
      currency: row.currency,
      yearlyDiscountPercent: row.yearlyDiscountPercent
    } : {
      pricePerStudent: 1.5,
      pricePerTeacher: 2.0,
      pricePerGBStorage: 0.2,
      pricePerInvoice: 0.05,
      currency: 'USD',
      yearlyDiscountPercent: 0
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
    const currency = String(p.currency ?? 'USD').trim().toUpperCase()
    const yearlyDiscountPercent = Number(p.yearlyDiscountPercent ?? 0)
    if (!Number.isFinite(pricePerStudent) || pricePerStudent < 0) return res.status(400).json({ message: 'pricePerStudent must be ≥ 0' })
    if (!Number.isFinite(pricePerTeacher) || pricePerTeacher < 0) return res.status(400).json({ message: 'pricePerTeacher must be ≥ 0' })
    if (!Number.isFinite(pricePerGBStorage) || pricePerGBStorage < 0) return res.status(400).json({ message: 'pricePerGBStorage must be ≥ 0' })
    if (!Number.isFinite(pricePerInvoice) || pricePerInvoice < 0) return res.status(400).json({ message: 'pricePerInvoice must be ≥ 0' })
    if (!/^[A-Z]{3,6}$/.test(currency)) return res.status(400).json({ message: 'currency must be 3-6 uppercase letters' })
    if (!Number.isFinite(yearlyDiscountPercent) || yearlyDiscountPercent < 0 || yearlyDiscountPercent > 100) return res.status(400).json({ message: 'yearlyDiscountPercent must be between 0 and 100' })
    const [row] = await PricingConfig.findOrCreate({ where: { id: 'default' }, defaults: { id: 'default', pricePerStudent, pricePerTeacher, pricePerGBStorage, pricePerInvoice, currency, yearlyDiscountPercent } })
    row.pricePerStudent = pricePerStudent
    row.pricePerTeacher = pricePerTeacher
    row.pricePerGBStorage = pricePerGBStorage
    row.pricePerInvoice = pricePerInvoice
    row.currency = currency
    row.yearlyDiscountPercent = yearlyDiscountPercent
    await row.save()
    res.json({ pricePerStudent: row.pricePerStudent, pricePerTeacher: row.pricePerTeacher, pricePerGBStorage: row.pricePerGBStorage, pricePerInvoice: row.pricePerInvoice, currency: row.currency, yearlyDiscountPercent: row.yearlyDiscountPercent })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

module.exports = router
