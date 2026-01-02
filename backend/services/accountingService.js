const { Account, JournalEntry, JournalEntryLine, FiscalPeriod, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Accounting Service
 * Handles all accounting operations including journal entries, balance validation, and posting
 */
class AccountingService {

    /**
     * Create a new journal entry with validation
     * @param {Object} entryData - Journal entry data
     * @param {number} entryData.schoolId - School ID
     * @param {string} entryData.date - Entry date
     * @param {string} entryData.description - Entry description
     * @param {string} entryData.referenceType - Reference type (INVOICE, PAYMENT, etc.)
     * @param {number} entryData.referenceId - Reference ID
     * @param {number} entryData.createdBy - User ID who created the entry
     * @param {Array} entryData.lines - Array of entry lines
     * @returns {Promise<JournalEntry>}
     */
    async createJournalEntry(entryData) {
        const transaction = await sequelize.transaction();

        try {
            const { schoolId, date, description, referenceType, referenceId, createdBy, lines } = entryData;

            // Validate lines
            if (!lines || lines.length < 2) {
                throw new Error('Journal entry must have at least 2 lines');
            }

            // Calculate totals
            let totalDebit = 0;
            let totalCredit = 0;

            lines.forEach(line => {
                const debit = parseFloat(line.debit) || 0;
                const credit = parseFloat(line.credit) || 0;
                totalDebit += debit;
                totalCredit += credit;
            });

            // Validate balance
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
            }

            // Get fiscal period
            const fiscalPeriod = await this.getFiscalPeriodForDate(schoolId, date);

            if (fiscalPeriod && fiscalPeriod.status === 'CLOSED') {
                throw new Error('Cannot create entry in a closed fiscal period');
            }

            // Generate entry number
            const entryNumber = await this.generateEntryNumber(schoolId, date);

            // Create journal entry
            const journalEntry = await JournalEntry.create({
                schoolId,
                entryNumber,
                date,
                description,
                reference: entryData.reference || null,
                referenceType,
                referenceId,
                fiscalPeriodId: fiscalPeriod ? fiscalPeriod.id : null,
                status: 'DRAFT',
                createdBy,
                totalDebit,
                totalCredit
            }, { transaction });

            // Create entry lines
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                await JournalEntryLine.create({
                    journalEntryId: journalEntry.id,
                    accountId: line.accountId,
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0,
                    description: line.description || description,
                    lineNumber: i + 1
                }, { transaction });
            }

            await transaction.commit();

            // Reload with lines
            return await JournalEntry.findByPk(journalEntry.id, {
                include: [
                    { model: JournalEntryLine, include: [Account] },
                    { model: FiscalPeriod }
                ]
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Post a journal entry (make it permanent and update balances)
     * @param {number} entryId - Journal entry ID
     * @param {number} userId - User ID who is posting
     * @returns {Promise<JournalEntry>}
     */
    async postJournalEntry(entryId, userId) {
        const transaction = await sequelize.transaction();

        try {
            const entry = await JournalEntry.findByPk(entryId, {
                include: [
                    { model: JournalEntryLine, include: [Account] },
                    { model: FiscalPeriod }
                ]
            });

            if (!entry) {
                throw new Error('Journal entry not found');
            }

            if (entry.status !== 'DRAFT') {
                throw new Error(`Cannot post entry with status: ${entry.status}`);
            }

            // Check fiscal period
            if (entry.FiscalPeriod && entry.FiscalPeriod.status === 'CLOSED') {
                throw new Error('Cannot post entry in a closed fiscal period');
            }

            // Validate balance again
            if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
                throw new Error('Journal entry is not balanced');
            }

            // Update account balances
            for (const line of entry.JournalEntryLines) {
                const account = line.Account;
                const debit = parseFloat(line.debit) || 0;
                const credit = parseFloat(line.credit) || 0;

                // Calculate balance change based on account type
                let balanceChange = 0;
                if (['ASSET', 'EXPENSE'].includes(account.type)) {
                    // Debit increases, credit decreases
                    balanceChange = debit - credit;
                } else {
                    // LIABILITY, EQUITY, REVENUE: Credit increases, debit decreases
                    balanceChange = credit - debit;
                }

                await Account.update(
                    { balance: sequelize.literal(`balance + ${balanceChange}`) },
                    { where: { id: account.id }, transaction }
                );
            }

            // Update entry status
            await entry.update({
                status: 'POSTED',
                postedAt: new Date(),
                postedBy: userId
            }, { transaction });

            await transaction.commit();

            return await JournalEntry.findByPk(entryId, {
                include: [
                    { model: JournalEntryLine, include: [Account] },
                    { model: FiscalPeriod }
                ]
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reverse a posted journal entry
     * @param {number} entryId - Journal entry ID to reverse
     * @param {number} userId - User ID who is reversing
     * @param {string} reason - Reason for reversal
     * @returns {Promise<JournalEntry>} - The reversing entry
     */
    async reverseJournalEntry(entryId, userId, reason) {
        const transaction = await sequelize.transaction();

        try {
            const originalEntry = await JournalEntry.findByPk(entryId, {
                include: [
                    { model: JournalEntryLine, include: [Account] },
                    { model: FiscalPeriod }
                ]
            });

            if (!originalEntry) {
                throw new Error('Journal entry not found');
            }

            if (originalEntry.status !== 'POSTED') {
                throw new Error('Can only reverse posted entries');
            }

            if (originalEntry.reversedBy) {
                throw new Error('Entry has already been reversed');
            }

            // Check fiscal period
            if (originalEntry.FiscalPeriod && originalEntry.FiscalPeriod.status === 'CLOSED') {
                throw new Error('Cannot reverse entry in a closed fiscal period');
            }

            // Create reversing entry
            const reversingLines = originalEntry.JournalEntryLines.map(line => ({
                accountId: line.accountId,
                debit: line.credit, // Swap debit and credit
                credit: line.debit,
                description: `عكس قيد: ${line.description}`
            }));

            const reversingEntry = await this.createJournalEntry({
                schoolId: originalEntry.schoolId,
                date: new Date().toISOString().split('T')[0],
                description: `عكس قيد رقم ${originalEntry.entryNumber}: ${reason}`,
                referenceType: 'MANUAL',
                referenceId: null,
                createdBy: userId,
                lines: reversingLines
            });

            // Post the reversing entry
            await this.postJournalEntry(reversingEntry.id, userId);

            // Mark original as reversed
            await originalEntry.update({
                status: 'REVERSED',
                reversedBy: reversingEntry.id,
                reversedAt: new Date()
            }, { transaction });

            await transaction.commit();

            return reversingEntry;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get fiscal period for a specific date
     * @param {number} schoolId - School ID
     * @param {string} date - Date to check
     * @returns {Promise<FiscalPeriod|null>}
     */
    async getFiscalPeriodForDate(schoolId, date) {
        return await FiscalPeriod.findOne({
            where: {
                schoolId,
                startDate: { [Op.lte]: date },
                endDate: { [Op.gte]: date }
            }
        });
    }

    /**
     * Generate sequential entry number
     * @param {number} schoolId - School ID
     * @param {string} date - Entry date
     * @returns {Promise<string>}
     */
    async generateEntryNumber(schoolId, date) {
        const year = new Date(date).getFullYear();
        const prefix = `JE-${year}-`;

        const lastEntry = await JournalEntry.findOne({
            where: {
                schoolId,
                entryNumber: { [Op.like]: `${prefix}%` }
            },
            order: [['entryNumber', 'DESC']]
        });

        let nextNumber = 1;
        if (lastEntry) {
            const lastNumber = parseInt(lastEntry.entryNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    }

    /**
     * Get account balance
     * @param {number} accountId - Account ID
     * @returns {Promise<number>}
     */
    async getAccountBalance(accountId) {
        const account = await Account.findByPk(accountId);
        return account ? parseFloat(account.balance) : 0;
    }

    /**
     * Validate that a journal entry is balanced
     * @param {Array} lines - Entry lines
     * @returns {boolean}
     */
    validateBalance(lines) {
        let totalDebit = 0;
        let totalCredit = 0;

        lines.forEach(line => {
            totalDebit += parseFloat(line.debit) || 0;
            totalCredit += parseFloat(line.credit) || 0;
        });

        return Math.abs(totalDebit - totalCredit) < 0.01;
    }

    /**
     * Close a fiscal period
     * @param {number} periodId - Fiscal period ID
     * @param {number} userId - User ID who is closing
     * @returns {Promise<FiscalPeriod>}
     */
    async closeFiscalPeriod(periodId, userId) {
        const period = await FiscalPeriod.findByPk(periodId);

        if (!period) {
            throw new Error('Fiscal period not found');
        }

        if (period.status === 'CLOSED') {
            throw new Error('Fiscal period is already closed');
        }

        // Check for draft entries in this period
        const draftEntries = await JournalEntry.count({
            where: {
                fiscalPeriodId: periodId,
                status: 'DRAFT'
            }
        });

        if (draftEntries > 0) {
            throw new Error(`Cannot close period with ${draftEntries} draft entries`);
        }

        await period.update({
            status: 'CLOSED',
            closedAt: new Date(),
            closedBy: userId
        });

        return period;
    }
}

module.exports = new AccountingService();
