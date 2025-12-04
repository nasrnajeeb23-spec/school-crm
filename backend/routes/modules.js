const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../middleware/auth')

router.get('/', verifyToken, async (req, res) => {
  try {
    const { ModuleCatalog } = require('../models')
    const rows = await ModuleCatalog.findAll({ order: [['isCore','DESC'], ['name','ASC']] })
    res.json(rows.map(r => ({ id: r.id, name: r.name, description: r.description, monthlyPrice: r.monthlyPrice, annualPrice: r.annualPrice || null, currency: r.currency, isEnabled: !!r.isEnabled, isCore: !!r.isCore })))
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { ModuleCatalog } = require('../models')
    const p = req.body || {}
    if (!p.id || !p.name) return res.status(400).json({ message: 'id and name required' })
    const row = await ModuleCatalog.create({ id: String(p.id), name: String(p.name), description: String(p.description || ''), monthlyPrice: Number(p.monthlyPrice || 0), annualPrice: p.annualPrice ? Number(p.annualPrice) : null, currency: String(p.currency || 'USD'), isEnabled: !!p.isEnabled, isCore: !!p.isCore })
    res.status(201).json({ id: row.id, name: row.name, description: row.description, monthlyPrice: row.monthlyPrice, annualPrice: row.annualPrice, currency: row.currency, isEnabled: !!row.isEnabled, isCore: !!row.isCore })
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
  row.annualPrice = p.annualPrice === undefined ? row.annualPrice : Number(p.annualPrice)
  row.currency = String(p.currency ?? row.currency)
  row.isEnabled = p.isEnabled === undefined ? row.isEnabled : !!p.isEnabled
  row.isCore = p.isCore === undefined ? row.isCore : !!p.isCore
  await row.save()
  res.json({ id: row.id, name: row.name, description: row.description, monthlyPrice: row.monthlyPrice, annualPrice: row.annualPrice, currency: row.currency, isEnabled: !!row.isEnabled, isCore: !!row.isCore })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

module.exports = router
