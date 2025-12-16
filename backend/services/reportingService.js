const { Account, JournalEntry, JournalEntryLine, FiscalPeriod, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Reporting Service
 * Generates financial reports: Trial Balance, Income Statement, Balance Sheet
 */
class ReportingService {

    /**
     * Generate Trial Balance
     * Shows all accounts with their debit and credit balances
     */
    async generateTrialBalance(schoolId, options = {}) {
        const { startDate, endDate, fiscalPeriodId } = options;

        let whereClause = { schoolId, isActive: true };

        const accounts = await Account.findAll({
            where: whereClause,
            order: [['code', 'ASC']]
        });

        const trialBalance = accounts.map(account => ({
            code: account.code,
            name: account.name,
            type: account.type,
            debit: account.type === 'ASSET' || account.type === 'EXPENSE' ? parseFloat(account.balance) : 0,
            credit: account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'REVENUE' ? parseFloat(account.balance) : 0
        }));

        const totalDebit = trialBalance.reduce((sum, acc) => sum + acc.debit, 0);
        const totalCredit = trialBalance.reduce((sum, acc) => sum + acc.credit, 0);

        return {
            accounts: trialBalance,
            totalDebit,
            totalCredit,
            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
        };
    }

    /**
     * Generate Income Statement (Profit & Loss)
     * Shows revenues and expenses for a period
     */
    async generateIncomeStatement(schoolId, options = {}) {
        const { startDate, endDate, fiscalPeriodId } = options;

        // Get revenue accounts
        const revenueAccounts = await Account.findAll({
            where: { schoolId, type: 'REVENUE', isActive: true },
            order: [['code', 'ASC']]
        });

        // Get expense accounts
        const expenseAccounts = await Account.findAll({
            where: { schoolId, type: 'EXPENSE', isActive: true },
            order: [['code', 'ASC']]
        });

        const revenues = revenueAccounts.map(acc => ({
            code: acc.code,
            name: acc.name,
            amount: parseFloat(acc.balance)
        }));

        const expenses = expenseAccounts.map(acc => ({
            code: acc.code,
            name: acc.name,
            amount: parseFloat(acc.balance)
        }));

        const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
            revenues,
            totalRevenue,
            expenses,
            totalExpenses,
            netIncome,
            period: options
        };
    }

    /**
     * Generate Balance Sheet
     * Shows assets, liabilities, and equity at a point in time
     */
    async generateBalanceSheet(schoolId, options = {}) {
        const { asOfDate } = options;

        // Get assets
        const assets = await Account.findAll({
            where: { schoolId, type: 'ASSET', isActive: true },
            order: [['code', 'ASC']]
        });

        // Get liabilities
        const liabilities = await Account.findAll({
            where: { schoolId, type: 'LIABILITY', isActive: true },
            order: [['code', 'ASC']]
        });

        // Get equity
        const equity = await Account.findAll({
            where: { schoolId, type: 'EQUITY', isActive: true },
            order: [['code', 'ASC']]
        });

        const assetsList = assets.map(acc => ({
            code: acc.code,
            name: acc.name,
            amount: parseFloat(acc.balance)
        }));

        const liabilitiesList = liabilities.map(acc => ({
            code: acc.code,
            name: acc.name,
            amount: parseFloat(acc.balance)
        }));

        const equityList = equity.map(acc => ({
            code: acc.code,
            name: acc.name,
            amount: parseFloat(acc.balance)
        }));

        const totalAssets = assetsList.reduce((sum, a) => sum + a.amount, 0);
        const totalLiabilities = liabilitiesList.reduce((sum, l) => sum + l.amount, 0);
        const totalEquity = equityList.reduce((sum, e) => sum + e.amount, 0);

        return {
            assets: assetsList,
            totalAssets,
            liabilities: liabilitiesList,
            totalLiabilities,
            equity: equityList,
            totalEquity,
            totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
            asOfDate: asOfDate || new Date().toISOString().split('T')[0]
        };
    }

    /**
     * Get ledger for a specific account
     * Shows all transactions affecting an account
     */
    async getAccountLedger(accountId, options = {}) {
        const { startDate, endDate, limit = 100, offset = 0 } = options;

        const account = await Account.findByPk(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        let whereClause = { accountId };

        if (startDate || endDate) {
            whereClause['$JournalEntry.date$'] = {};
            if (startDate) whereClause['$JournalEntry.date$'][Op.gte] = startDate;
            if (endDate) whereClause['$JournalEntry.date$'][Op.lte] = endDate;
        }

        const lines = await JournalEntryLine.findAll({
            where: whereClause,
            include: [
                {
                    model: JournalEntry,
                    where: { status: 'POSTED' },
                    attributes: ['id', 'entryNumber', 'date', 'description', 'referenceType', 'referenceId']
                }
            ],
            order: [[JournalEntry, 'date', 'ASC'], [JournalEntry, 'id', 'ASC'], ['lineNumber', 'ASC']],
            limit,
            offset
        });

        let runningBalance = 0;
        const transactions = lines.map(line => {
            const debit = parseFloat(line.debit) || 0;
            const credit = parseFloat(line.credit) || 0;

            // Calculate balance change based on account type
            let balanceChange = 0;
            if (['ASSET', 'EXPENSE'].includes(account.type)) {
                balanceChange = debit - credit;
            } else {
                balanceChange = credit - debit;
            }

            runningBalance += balanceChange;

            return {
                date: line.JournalEntry.date,
                entryNumber: line.JournalEntry.entryNumber,
                description: line.description,
                referenceType: line.JournalEntry.referenceType,
                referenceId: line.JournalEntry.referenceId,
                debit,
                credit,
                balance: runningBalance
            };
        });

        return {
            account: {
                code: account.code,
                name: account.name,
                type: account.type,
                currentBalance: parseFloat(account.balance)
            },
            transactions,
            count: transactions.length
        };
    }
}

module.exports = new ReportingService();
