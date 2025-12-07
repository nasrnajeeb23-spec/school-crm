const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { ModuleCatalog } = require('../models');

// Helper to get effective catalog
const getEffectiveCatalog = async (req) => {
    const dbModules = await ModuleCatalog.findAll();
    const memoryCatalog = Array.isArray(req.app?.locals?.modulesCatalog) ? req.app.locals.modulesCatalog : [];
    
    const dbMap = new Map(dbModules.map(m => [m.id, m]));
    const combined = [];
    const seenIds = new Set();

    // 1. Add/Merge memory modules
    for (const mem of memoryCatalog) {
        seenIds.add(mem.id);
        if (dbMap.has(mem.id)) {
            // DB overrides memory
            const db = dbMap.get(mem.id);
            combined.push({
                id: db.id,
                name: db.name,
                description: db.description,
                monthlyPrice: Number(db.monthlyPrice),
                oneTimePrice: Number(db.oneTimePrice || 0),
                annualPrice: Number(db.annualPrice || 0),
                currency: db.currency || 'USD',
                isEnabled: db.isEnabled,
                isCore: db.isCore,
                isSystem: true
            });
        } else {
            // Use memory version
            combined.push({
                id: mem.id,
                name: mem.name,
                description: mem.description,
                monthlyPrice: Number(mem.monthlyPrice),
                oneTimePrice: Number(mem.oneTimePrice || 0),
                annualPrice: 0,
                currency: 'USD',
                isEnabled: mem.isEnabled !== false,
                isCore: !!mem.isCore,
                isSystem: true
            });
        }
    }

    // 2. Add DB-only modules (custom ones created by superadmin)
    for (const db of dbModules) {
        if (!seenIds.has(db.id)) {
            combined.push({
                id: db.id,
                name: db.name,
                description: db.description,
                monthlyPrice: Number(db.monthlyPrice),
                oneTimePrice: Number(db.oneTimePrice || 0),
                annualPrice: Number(db.annualPrice || 0),
                currency: db.currency || 'USD',
                isEnabled: db.isEnabled,
                isCore: db.isCore,
                isSystem: false
            });
        }
    }
    
    // Sort: Core first, then by name
    return combined.sort((a, b) => {
        if (a.isCore === b.isCore) return a.name.localeCompare(b.name);
        return a.isCore ? -1 : 1;
    });
};

router.get('/', verifyToken, async (req, res) => {
    try {
        const list = await getEffectiveCatalog(req);
        res.json(list);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

router.post('/', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const p = req.body || {};
        if (!p.id || !p.name) return res.status(400).json({ message: 'id and name required' });
        
        const row = await ModuleCatalog.create({
            id: String(p.id),
            name: String(p.name),
            description: String(p.description || ''),
            monthlyPrice: Number(p.monthlyPrice || 0),
            oneTimePrice: p.oneTimePrice ? Number(p.oneTimePrice) : null,
            annualPrice: p.annualPrice ? Number(p.annualPrice) : null,
            currency: String(p.currency || 'USD'),
            isEnabled: !!p.isEnabled,
            isCore: !!p.isCore
        });
        
        res.status(201).json({
            id: row.id,
            name: row.name,
            description: row.description,
            monthlyPrice: row.monthlyPrice,
            oneTimePrice: row.oneTimePrice || 0,
            annualPrice: row.annualPrice,
            currency: row.currency,
            isEnabled: !!row.isEnabled,
            isCore: !!row.isCore
        });
    } catch (e) {
        console.error(e?.message || e);
        res.status(500).send('Server Error');
    }
});

router.put('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        // Auto-heal: Ensure schema is up to date
        try { await ModuleCatalog.sync({ alter: true }); } catch (e) { console.error('Sync ModuleCatalog Error:', e); }

        const id = String(req.params.id || '');
        let row = await ModuleCatalog.findByPk(id);
        const p = req.body || {};

        if (!row) {
            // Not in DB, check memory
            const memoryCatalog = Array.isArray(req.app?.locals?.modulesCatalog) ? req.app.locals.modulesCatalog : [];
            const mem = memoryCatalog.find(m => m.id === id);
            
            if (!mem) {
                return res.status(404).json({ message: 'Module not found' });
            }

            // Found in memory, create in DB (Materialize)
            row = await ModuleCatalog.create({
                id: mem.id,
                name: p.name ?? mem.name,
                description: p.description ?? mem.description,
                monthlyPrice: p.monthlyPrice !== undefined ? Number(p.monthlyPrice) : mem.monthlyPrice,
                oneTimePrice: p.oneTimePrice !== undefined ? Number(p.oneTimePrice) : (mem.oneTimePrice || 0),
                annualPrice: p.annualPrice !== undefined ? Number(p.annualPrice) : 0,
                currency: p.currency ?? 'USD',
                isEnabled: p.isEnabled !== undefined ? !!p.isEnabled : mem.isEnabled,
                isCore: p.isCore !== undefined ? !!p.isCore : mem.isCore
            });
        } else {
            // Update existing DB record
            if (p.name !== undefined) row.name = String(p.name);
            if (p.description !== undefined) row.description = String(p.description);
            if (p.monthlyPrice !== undefined) row.monthlyPrice = Number(p.monthlyPrice);
            if (p.oneTimePrice !== undefined) row.oneTimePrice = Number(p.oneTimePrice);
            if (p.annualPrice !== undefined) row.annualPrice = Number(p.annualPrice);
            if (p.currency !== undefined) row.currency = String(p.currency);
            if (p.isEnabled !== undefined) row.isEnabled = !!p.isEnabled;
            if (p.isCore !== undefined) row.isCore = !!p.isCore;
            await row.save();
        }

        res.json({
            id: row.id,
            name: row.name,
            description: row.description,
            monthlyPrice: row.monthlyPrice,
            oneTimePrice: row.oneTimePrice,
            annualPrice: row.annualPrice,
            currency: row.currency,
            isEnabled: row.isEnabled,
            isCore: row.isCore
        });
    } catch (e) {
        console.error(e?.message || e);
        res.status(500).send('Server Error');
    }
});

router.delete('/:id', verifyToken, requireRole('SUPER_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id || '');
        const row = await ModuleCatalog.findByPk(id);
        
        if (!row) {
            // Check if it's a built-in module
            const memoryCatalog = Array.isArray(req.app?.locals?.modulesCatalog) ? req.app.locals.modulesCatalog : [];
            const isBuiltIn = memoryCatalog.some(m => m.id === id);
            
            if (isBuiltIn) {
                return res.status(400).json({ message: 'Cannot delete built-in module. You can disable it by editing.' });
            }
            
            return res.status(404).json({ message: 'Module not found' });
        }

        // Prevent deleting core modules even if in DB
        if (row.isCore || id === 'finance') {
             return res.status(400).json({ message: 'Cannot delete a Core module. You can disable it instead.' });
        }
        
        await row.destroy();
        res.json({ deleted: true });
    } catch (e) {
        console.error(`Delete Module Error (${req.params.id}):`, e);
        if (e.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: 'Cannot delete this module because it is assigned to one or more schools. Please remove it from all subscriptions first.' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
