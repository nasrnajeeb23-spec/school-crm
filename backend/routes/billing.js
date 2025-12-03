const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')

router.post('/payment-proof', verifyToken, async (req, res) => {
  try {
    const { Notification } = require('../models')
    const p = req.body || {}
    const title = String(p.relatedService || 'Payment Proof')
    const desc = `Method: ${p.method || ''} | Amount: ${p.amount || 0} | Ref: ${p.reference || ''} | School: ${p.schoolName || ''}`
    await Notification.create({ type: 'Approval', title, description: desc, status: 'Pending' })
    res.json({ success: true })
  } catch (e) { console.error(e?.message || e); res.status(500).send('Server Error') }
})

module.exports = router
