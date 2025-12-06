const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../middleware/auth')

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

module.exports = router
