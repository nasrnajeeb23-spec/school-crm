const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const accountingService = require('../services/accountingService');
const reportingService = require('../services/reportingService');
const { Account, JournalEntry, JournalEntryLine, FiscalPeriod } = require('../models');
const { Op } = require('sequelize');

// Middleware to check if user has accounting access
const requireAccountingAccess = (req, res, next) => {
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied. Accounting access required.' });
    }
    next();
};

// Middleware to check if user is accountant or super admin
const requireAccountant = (req, res, next) => {
    if (!['SUPER_ADMIN', 'ACCOUNTANT'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied. Accountant role required.' });
    }
    next();
};

// Apply authentication to all routes
router.use(verifyToken);
router.use(requireAccountingAccess);

// ==================== CHART OF ACCOUNTS ====================

// Get all accounts (with hierarchy)
router.get('/accounts', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { type, isActive, parentId } = req.query;

        let where = { schoolId };
        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (parentId !== undefined) where.parentId = parentId === 'null' ? null : parentId;

        const accounts = await Account.findAll({
            where,
            order: [['code', 'ASC']],
            include: [
                { model: Account, as: 'Parent', attributes: ['id', 'code', 'name'] },
                { model: Account, as: 'Children', attributes: ['id', 'code', 'name', 'type', 'balance'] }
            ]
        });

        res.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Get account tree (hierarchical structure)
router.get('/accounts/tree', async (req, res) => {
    try {
        const { schoolId } = req.user;

        const accounts = await Account.findAll({
            where: { schoolId, isActive: true },
            order: [['code', 'ASC']]
        });

        // Build tree structure
        const accountMap = {};
        const tree = [];

        accounts.forEach(acc => {
            accountMap[acc.id] = { ...acc.toJSON(), children: [] };
        });

        accounts.forEach(acc => {
            if (acc.parentId) {
                if (accountMap[acc.parentId]) {
                    accountMap[acc.parentId].children.push(accountMap[acc.id]);
                }
            } else {
                tree.push(accountMap[acc.id]);
            }
        });

        res.json(tree);
    } catch (error) {
        console.error('Error fetching account tree:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Get single account
router.get('/accounts/:id', async (req, res) => {
    try {
        const account = await Account.findByPk(req.params.id, {
            include: [
                { model: Account, as: 'Parent' },
                { model: Account, as: 'Children' }
            ]
        });

        if (!account) {
            return res.status(404).json({ msg: 'Account not found' });
        }

        if (account.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        res.json(account);
    } catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Create new account
router.post('/accounts', requireAccountant, async (req, res) => {
    try {
        const { code, name, nameEn, type, parentId, description } = req.body;
        const { schoolId } = req.user;

        // Check if code already exists
        const existing = await Account.findOne({ where: { schoolId, code } });
        if (existing) {
            return res.status(400).json({ msg: 'Account code already exists' });
        }

        // Determine level
        let level = 1;
        if (parentId) {
            const parent = await Account.findByPk(parentId);
            if (!parent || parent.schoolId !== schoolId) {
                return res.status(400).json({ msg: 'Invalid parent account' });
            }
            level = parent.level + 1;
        }

        const account = await Account.create({
            schoolId,
            code,
            name,
            nameEn,
            type,
            parentId,
            level,
            description,
            isSystem: false
        });

        res.status(201).json(account);
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Update account
router.put('/accounts/:id', requireAccountant, async (req, res) => {
    try {
        const account = await Account.findByPk(req.params.id);

        if (!account) {
            return res.status(404).json({ msg: 'Account not found' });
        }

        if (account.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        if (account.isSystem) {
            return res.status(400).json({ msg: 'Cannot modify system account' });
        }

        const { name, nameEn, description, isActive } = req.body;
        await account.update({ name, nameEn, description, isActive });

        res.json(account);
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Delete account
router.delete('/accounts/:id', requireAccountant, async (req, res) => {
    try {
        const account = await Account.findByPk(req.params.id);

        if (!account) {
            return res.status(404).json({ msg: 'Account not found' });
        }

        if (account.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        if (account.isSystem) {
            return res.status(400).json({ msg: 'Cannot delete system account' });
        }

        // Check if account has children
        const children = await Account.count({ where: { parentId: account.id } });
        if (children > 0) {
            return res.status(400).json({ msg: 'Cannot delete account with child accounts' });
        }

        // Check if account has transactions
        const transactions = await JournalEntryLine.count({ where: { accountId: account.id } });
        if (transactions > 0) {
            return res.status(400).json({ msg: 'Cannot delete account with transactions. Deactivate instead.' });
        }

        await account.destroy();
        res.json({ msg: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// ==================== JOURNAL ENTRIES ====================

// Get all journal entries
router.get('/journal-entries', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { status, referenceType, startDate, endDate, limit = 50, offset = 0 } = req.query;

        let where = { schoolId };
        if (status) where.status = status;
        if (referenceType) where.referenceType = referenceType;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = startDate;
            if (endDate) where.date[Op.lte] = endDate;
        }

        const entries = await JournalEntry.findAndCountAll({
            where,
            include: [
                {
                    model: JournalEntryLine,
                    include: [{ model: Account, attributes: ['id', 'code', 'name'] }]
                },
                { model: FiscalPeriod, attributes: ['id', 'name', 'status'] }
            ],
            order: [['date', 'DESC'], ['id', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json(entries);
    } catch (error) {
        console.error('Error fetching journal entries:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Get single journal entry
router.get('/journal-entries/:id', async (req, res) => {
    try {
        const entry = await JournalEntry.findByPk(req.params.id, {
            include: [
                {
                    model: JournalEntryLine,
                    include: [Account],
                    order: [['lineNumber', 'ASC']]
                },
                { model: FiscalPeriod }
            ]
        });

        if (!entry) {
            return res.status(404).json({ msg: 'Journal entry not found' });
        }

        if (entry.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        res.json(entry);
    } catch (error) {
        console.error('Error fetching journal entry:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Create journal entry
router.post('/journal-entries', requireAccountant, async (req, res) => {
    try {
        const { date, description, lines, reference } = req.body;
        const { schoolId, id: userId } = req.user;

        if (!lines || lines.length < 2) {
            return res.status(400).json({ msg: 'Journal entry must have at least 2 lines' });
        }

        const entry = await accountingService.createJournalEntry({
            schoolId,
            date,
            description,
            reference,
            referenceType: 'MANUAL',
            referenceId: null,
            createdBy: userId,
            lines
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(400).json({ msg: error.message });
    }
});

// Update journal entry (draft only)
router.put('/journal-entries/:id', requireAccountant, async (req, res) => {
    try {
        const entry = await JournalEntry.findByPk(req.params.id);

        if (!entry) {
            return res.status(404).json({ msg: 'Journal entry not found' });
        }

        if (entry.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        if (entry.status !== 'DRAFT') {
            return res.status(400).json({ msg: 'Can only update draft entries' });
        }

        const { description } = req.body;
        await entry.update({ description });

        res.json(entry);
    } catch (error) {
        console.error('Error updating journal entry:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Post journal entry
router.post('/journal-entries/:id/post', requireAccountant, async (req, res) => {
    try {
        const entry = await accountingService.postJournalEntry(
            parseInt(req.params.id),
            req.user.id
        );

        res.json(entry);
    } catch (error) {
        console.error('Error posting journal entry:', error);
        res.status(400).json({ msg: error.message });
    }
});

// Reverse journal entry
router.post('/journal-entries/:id/reverse', requireAccountant, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ msg: 'Reason for reversal is required' });
        }

        const reversingEntry = await accountingService.reverseJournalEntry(
            parseInt(req.params.id),
            req.user.id,
            reason
        );

        res.json(reversingEntry);
    } catch (error) {
        console.error('Error reversing journal entry:', error);
        res.status(400).json({ msg: error.message });
    }
});

// Delete journal entry (draft only)
router.delete('/journal-entries/:id', requireAccountant, async (req, res) => {
    try {
        const entry = await JournalEntry.findByPk(req.params.id);

        if (!entry) {
            return res.status(404).json({ msg: 'Journal entry not found' });
        }

        if (entry.schoolId !== req.user.schoolId && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        if (entry.status !== 'DRAFT') {
            return res.status(400).json({ msg: 'Can only delete draft entries' });
        }

        await entry.destroy();
        res.json({ msg: 'Journal entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// ==================== FISCAL PERIODS ====================

// Get all fiscal periods
router.get('/fiscal-periods', async (req, res) => {
    try {
        const { schoolId } = req.user;

        const periods = await FiscalPeriod.findAll({
            where: { schoolId },
            order: [['startDate', 'DESC']]
        });

        res.json(periods);
    } catch (error) {
        console.error('Error fetching fiscal periods:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Create fiscal period
router.post('/fiscal-periods', requireAccountant, async (req, res) => {
    try {
        const { name, startDate, endDate, description } = req.body;
        const { schoolId } = req.user;

        // Check for overlapping periods
        const overlapping = await FiscalPeriod.findOne({
            where: {
                schoolId,
                [Op.or]: [
                    {
                        startDate: { [Op.lte]: endDate },
                        endDate: { [Op.gte]: startDate }
                    }
                ]
            }
        });

        if (overlapping) {
            return res.status(400).json({ msg: 'Fiscal period overlaps with existing period' });
        }

        const period = await FiscalPeriod.create({
            schoolId,
            name,
            startDate,
            endDate,
            description,
            status: 'OPEN'
        });

        res.status(201).json(period);
    } catch (error) {
        console.error('Error creating fiscal period:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Close fiscal period
router.post('/fiscal-periods/:id/close', requireAccountant, async (req, res) => {
    try {
        const period = await accountingService.closeFiscalPeriod(
            parseInt(req.params.id),
            req.user.id
        );

        res.json(period);
    } catch (error) {
        console.error('Error closing fiscal period:', error);
        res.status(400).json({ msg: error.message });
    }
});

// Reopen fiscal period (Super Admin only)
router.post('/fiscal-periods/:id/reopen', async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ msg: 'Only Super Admin can reopen fiscal periods' });
        }

        const period = await FiscalPeriod.findByPk(req.params.id);

        if (!period) {
            return res.status(404).json({ msg: 'Fiscal period not found' });
        }

        if (period.status !== 'CLOSED') {
            return res.status(400).json({ msg: 'Period is not closed' });
        }

        await period.update({
            status: 'OPEN',
            closedAt: null,
            closedBy: null
        });

        res.json(period);
    } catch (error) {
        console.error('Error reopening fiscal period:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// ==================== REPORTS ====================

// Trial Balance
router.get('/reports/trial-balance', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { startDate, endDate, fiscalPeriodId } = req.query;

        const report = await reportingService.generateTrialBalance(schoolId, {
            startDate,
            endDate,
            fiscalPeriodId
        });

        res.json(report);
    } catch (error) {
        console.error('Error generating trial balance:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Income Statement
router.get('/reports/income-statement', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { startDate, endDate, fiscalPeriodId } = req.query;

        const report = await reportingService.generateIncomeStatement(schoolId, {
            startDate,
            endDate,
            fiscalPeriodId
        });

        res.json(report);
    } catch (error) {
        console.error('Error generating income statement:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Balance Sheet
router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const { schoolId } = req.user;
        const { asOfDate } = req.query;

        const report = await reportingService.generateBalanceSheet(schoolId, {
            asOfDate
        });

        res.json(report);
    } catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Account Ledger
router.get('/reports/ledger/:accountId', async (req, res) => {
    try {
        const { startDate, endDate, limit, offset } = req.query;

        const ledger = await reportingService.getAccountLedger(
            parseInt(req.params.accountId),
            { startDate, endDate, limit, offset }
        );

        res.json(ledger);
    } catch (error) {
        console.error('Error generating ledger:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

module.exports = router;
