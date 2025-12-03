const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

router.get('/tooltips', async (req, res) => {
  try {
    const routeKey = String(req.query.route || '').trim() || 'dashboard'
    const filePath = path.join(__dirname, '..', 'docs', 'tooltips-map.json')
    const raw = fs.readFileSync(filePath, 'utf8')
    const map = JSON.parse(raw)
    const list = Array.isArray(map[routeKey]) ? map[routeKey] : []
    res.json({ route: routeKey, tooltips: list })
  } catch {
    res.json({ route: String(req.query.route || ''), tooltips: [] })
  }
})

module.exports = router
