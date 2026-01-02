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

router.get('/list', async (req, res) => {
  try {
    const docsDir = path.join(__dirname, '..', 'docs');
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    const docs = files.map(file => {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      const lines = content.split('\n');
      const title = lines[0].replace(/^#\s*/, '').trim();
      const categoryMatch = title.match(/\((.*?)\)/);
      const category = categoryMatch ? categoryMatch[1] : 'عام';
      return {
        id: file,
        title,
        category,
        fileName: file,
        language: file.includes('.ar.') ? 'ar' : 'en',
        preview: content.substring(0, 200) + '...'
      };
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ msg: 'Error loading docs' });
  }
});

router.get('/content/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // Prevent traversal
    if (!filename.endsWith('.md')) return res.status(400).json({ msg: 'Invalid file type' });
    
    const filePath = path.join(__dirname, '..', 'docs', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found' });
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ msg: 'Error reading file' });
  }
});

module.exports = router
