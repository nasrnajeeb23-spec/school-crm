const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../middleware/auth')

router.get('/config', verifyToken, async (req, res) => {
  try {
    const { PricingConfig, SchoolSettings } = require('../models')
    let row;
    try {
        row = await PricingConfig.findOne({ where: { id: 'default' } });
    } catch {
        row = null; // Handle if table missing or error
    }
    const cfg = row ? {
      pricePerStudent: row.pricePerStudent,
      pricePerTeacher: row.pricePerTeacher,
      pricePerGBStorage: row.pricePerGBStorage,
      pricePerInvoice: row.pricePerInvoice,
      pricePerEmail: row.pricePerEmail,
      pricePerSMS: row.pricePerSMS,
      currency: row.currency,
      yearlyDiscountPercent: row.yearlyDiscountPercent
    } : {
      pricePerStudent: 1.5,
      pricePerTeacher: 2.0,
      pricePerGBStorage: 0.2,
      pricePerInvoice: 0.05,
      pricePerEmail: 0.01,
      pricePerSMS: 0.03,
      currency: 'USD',
      yearlyDiscountPercent: 0
    }
    const schoolId = Number(req.user?.schoolId || 0)
    if (schoolId) {
      const settings = await SchoolSettings.findOne({ where: { schoolId } }).catch(() => null)
      if (settings && settings.defaultCurrency) {
        cfg.currency = String(settings.defaultCurrency).trim().toUpperCase()
      }
    }
    res.json(cfg)
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.get('/public/config', async (req, res) => {
  try {
    const { PricingConfig, SchoolSettings } = require('../models')
    let row;
    try {
        row = await PricingConfig.findOne({ where: { id: 'default' } }).catch(() => null)
    } catch { row = null; }
    const cfg = row ? {
      pricePerStudent: row.pricePerStudent,
      pricePerTeacher: row.pricePerTeacher,
      pricePerGBStorage: row.pricePerGBStorage,
      pricePerInvoice: row.pricePerInvoice,
      pricePerEmail: row.pricePerEmail,
      pricePerSMS: row.pricePerSMS,
      currency: row.currency,
      yearlyDiscountPercent: row.yearlyDiscountPercent
    } : {
      pricePerStudent: 1.5,
      pricePerTeacher: 2.0,
      pricePerGBStorage: 0.2,
      pricePerInvoice: 0.05,
      pricePerEmail: 0.01,
      pricePerSMS: 0.03,
      currency: 'USD',
      yearlyDiscountPercent: 0
    }
    const schoolId = parseInt((req.query && req.query.schoolId) || '', 10)
    if (Number.isFinite(schoolId) && schoolId > 0) {
      const settings = await SchoolSettings.findOne({ where: { schoolId } }).catch(() => null)
      if (settings && settings.defaultCurrency) {
        cfg.currency = String(settings.defaultCurrency).trim().toUpperCase()
      }
    }
    res.json(cfg)
  } catch (e) { console.error(e?.message || e); res.json({ pricePerStudent: 1.5, pricePerTeacher: 2.0, pricePerGBStorage: 0.2, pricePerInvoice: 0.05, pricePerEmail: 0.01, pricePerSMS: 0.03, currency: 'USD', yearlyDiscountPercent: 0 }) }
})

router.put('/config', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { PricingConfig } = require('../models')
    const p = req.body || {}
    const pricePerStudent = Number(p.pricePerStudent ?? 1.5)
    const pricePerTeacher = Number(p.pricePerTeacher ?? 2.0)
    const pricePerGBStorage = Number(p.pricePerGBStorage ?? 0.2)
    const pricePerInvoice = Number(p.pricePerInvoice ?? 0.05)
    const pricePerEmail = Number(p.pricePerEmail ?? 0.01)
    const pricePerSMS = Number(p.pricePerSMS ?? 0.03)
    const currency = String(p.currency ?? 'USD').trim().toUpperCase()
    const yearlyDiscountPercent = Number(p.yearlyDiscountPercent ?? 0)
    if (!Number.isFinite(pricePerStudent) || pricePerStudent < 0) return res.status(400).json({ message: 'pricePerStudent must be ≥ 0' })
    if (!Number.isFinite(pricePerTeacher) || pricePerTeacher < 0) return res.status(400).json({ message: 'pricePerTeacher must be ≥ 0' })
    if (!Number.isFinite(pricePerGBStorage) || pricePerGBStorage < 0) return res.status(400).json({ message: 'pricePerGBStorage must be ≥ 0' })
    if (!Number.isFinite(pricePerInvoice) || pricePerInvoice < 0) return res.status(400).json({ message: 'pricePerInvoice must be ≥ 0' })
    if (!Number.isFinite(pricePerEmail) || pricePerEmail < 0) return res.status(400).json({ message: 'pricePerEmail must be ≥ 0' })
    if (!Number.isFinite(pricePerSMS) || pricePerSMS < 0) return res.status(400).json({ message: 'pricePerSMS must be ≥ 0' })
    if (!/^[A-Z]{3,6}$/.test(currency)) return res.status(400).json({ message: 'currency must be 3-6 uppercase letters' })
    if (!Number.isFinite(yearlyDiscountPercent) || yearlyDiscountPercent < 0 || yearlyDiscountPercent > 100) return res.status(400).json({ message: 'yearlyDiscountPercent must be between 0 and 100' })
    const [row] = await PricingConfig.findOrCreate({ where: { id: 'default' }, defaults: { id: 'default', pricePerStudent, pricePerTeacher, pricePerGBStorage, pricePerInvoice, pricePerEmail, pricePerSMS, currency, yearlyDiscountPercent } })
    row.pricePerStudent = pricePerStudent
    row.pricePerTeacher = pricePerTeacher
    row.pricePerGBStorage = pricePerGBStorage
    row.pricePerInvoice = pricePerInvoice
    row.pricePerEmail = pricePerEmail
    row.pricePerSMS = pricePerSMS
    row.currency = currency
    row.yearlyDiscountPercent = yearlyDiscountPercent
    await row.save()
    res.json({ pricePerStudent: row.pricePerStudent, pricePerTeacher: row.pricePerTeacher, pricePerGBStorage: row.pricePerGBStorage, pricePerInvoice: row.pricePerInvoice, pricePerEmail: row.pricePerEmail, pricePerSMS: row.pricePerSMS, currency: row.currency, yearlyDiscountPercent: row.yearlyDiscountPercent })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

module.exports = router
