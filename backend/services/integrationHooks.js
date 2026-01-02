const accountingService = require('./accountingService');
const { Account } = require('../models');

/**
 * Integration Hooks Service
 * Automatically creates journal entries when invoices, payments, expenses, or salaries are recorded
 */
class IntegrationHooks {

    /**
     * Hook: When an invoice is created
     * Debit: Accounts Receivable
     * Credit: Tuition Revenue
     */
    async onInvoiceCreated(invoice, userId) {
        try {
            // Get the required accounts
            const accountsReceivable = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: '1130' } // Accounts Receivable
            });

            const tuitionRevenue = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: '4100' } // Tuition Revenue
            });

            if (!accountsReceivable || !tuitionRevenue) {
                console.error('Required accounts not found for invoice journal entry');
                return null;
            }

            const amount = parseFloat(invoice.amount) - parseFloat(invoice.discount || 0);

            const lines = [
                {
                    accountId: accountsReceivable.id,
                    debit: amount,
                    credit: 0,
                    description: `فاتورة رقم ${invoice.id} - طالب ${invoice.studentId}`
                },
                {
                    accountId: tuitionRevenue.id,
                    debit: 0,
                    credit: amount,
                    description: `إيرادات رسوم دراسية - فاتورة ${invoice.id}`
                }
            ];

            const entry = await accountingService.createJournalEntry({
                schoolId: invoice.schoolId,
                date: new Date().toISOString().split('T')[0],
                description: `فاتورة رقم ${invoice.id} - طالب ${invoice.studentId}`,
                referenceType: 'INVOICE',
                referenceId: invoice.id,
                createdBy: userId,
                lines
            });

            // Auto-post the entry
            await accountingService.postJournalEntry(entry.id, userId);

            return entry;
        } catch (error) {
            console.error('Error creating journal entry for invoice:', error);
            throw error;
        }
    }

    /**
     * Hook: When a payment is recorded
     * Debit: Cash/Bank
     * Credit: Accounts Receivable
     */
    async onPaymentRecorded(payment, invoice, userId) {
        try {
            const accountsReceivable = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: '1130' }
            });

            // Determine if cash or bank based on payment method
            const cashOrBankCode = payment.method === 'Bank Transfer' ? '1120' : '1110';
            const cashOrBank = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: cashOrBankCode }
            });

            if (!accountsReceivable || !cashOrBank) {
                console.error('Required accounts not found for payment journal entry');
                return null;
            }

            const amount = parseFloat(payment.amount);

            const lines = [
                {
                    accountId: cashOrBank.id,
                    debit: amount,
                    credit: 0,
                    description: `دفعة للفاتورة ${invoice.id} - ${payment.method}`
                },
                {
                    accountId: accountsReceivable.id,
                    debit: 0,
                    credit: amount,
                    description: `تحصيل من طالب - فاتورة ${invoice.id}`
                }
            ];

            const entry = await accountingService.createJournalEntry({
                schoolId: invoice.schoolId,
                date: payment.date || new Date().toISOString().split('T')[0],
                description: `دفعة رقم ${payment.id} للفاتورة ${invoice.id}`,
                referenceType: 'PAYMENT',
                referenceId: payment.id,
                reference: payment.reference,
                createdBy: userId,
                lines
            });

            await accountingService.postJournalEntry(entry.id, userId);

            return entry;
        } catch (error) {
            console.error('Error creating journal entry for payment:', error);
            throw error;
        }
    }

    /**
     * Hook: When a discount is applied
     * Debit: Discounts Given (Expense)
     * Credit: Accounts Receivable
     */
    async onDiscountApplied(invoice, discountAmount, userId) {
        try {
            const accountsReceivable = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: '1130' }
            });

            const discountsGiven = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: '5600' } // Discounts Given
            });

            if (!accountsReceivable || !discountsGiven) {
                console.error('Required accounts not found for discount journal entry');
                return null;
            }

            const amount = parseFloat(discountAmount);

            const lines = [
                {
                    accountId: discountsGiven.id,
                    debit: amount,
                    credit: 0,
                    description: `خصم على فاتورة ${invoice.id}`
                },
                {
                    accountId: accountsReceivable.id,
                    debit: 0,
                    credit: amount,
                    description: `خصم ممنوح - فاتورة ${invoice.id}`
                }
            ];

            const entry = await accountingService.createJournalEntry({
                schoolId: invoice.schoolId,
                date: new Date().toISOString().split('T')[0],
                description: `خصم على فاتورة ${invoice.id}`,
                referenceType: 'DISCOUNT',
                referenceId: invoice.id,
                createdBy: userId,
                lines
            });

            await accountingService.postJournalEntry(entry.id, userId);

            return entry;
        } catch (error) {
            console.error('Error creating journal entry for discount:', error);
            throw error;
        }
    }

    /**
     * Hook: When a refund is issued
     * Debit: Accounts Receivable
     * Credit: Cash/Bank
     */
    async onRefundIssued(invoice, refundAmount, paymentMethod, userId) {
        try {
            const accountsReceivable = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: '1130' }
            });

            const cashOrBankCode = paymentMethod === 'Bank Transfer' ? '1120' : '1110';
            const cashOrBank = await Account.findOne({
                where: { schoolId: invoice.schoolId, code: cashOrBankCode }
            });

            if (!accountsReceivable || !cashOrBank) {
                console.error('Required accounts not found for refund journal entry');
                return null;
            }

            const amount = parseFloat(refundAmount);

            const lines = [
                {
                    accountId: accountsReceivable.id,
                    debit: amount,
                    credit: 0,
                    description: `استرجاع للفاتورة ${invoice.id}`
                },
                {
                    accountId: cashOrBank.id,
                    debit: 0,
                    credit: amount,
                    description: `استرجاع مبلغ - فاتورة ${invoice.id}`
                }
            ];

            const entry = await accountingService.createJournalEntry({
                schoolId: invoice.schoolId,
                date: new Date().toISOString().split('T')[0],
                description: `استرجاع مبلغ للفاتورة ${invoice.id}`,
                referenceType: 'REFUND',
                referenceId: invoice.id,
                createdBy: userId,
                lines
            });

            await accountingService.postJournalEntry(entry.id, userId);

            return entry;
        } catch (error) {
            console.error('Error creating journal entry for refund:', error);
            throw error;
        }
    }

    /**
     * Hook: When an expense is recorded
     * Debit: Expense Account (based on accountId)
     * Credit: Cash/Bank
     */
    async onExpenseRecorded(expense, userId) {
        try {
            if (!expense.accountId) {
                throw new Error('Expense must have an accountId');
            }

            const expenseAccount = await Account.findByPk(expense.accountId);

            // Default to cash
            const cash = await Account.findOne({
                where: { schoolId: expense.schoolId, code: '1110' }
            });

            if (!expenseAccount || !cash) {
                console.error('Required accounts not found for expense journal entry');
                return null;
            }

            const amount = parseFloat(expense.amount);

            const lines = [
                {
                    accountId: expenseAccount.id,
                    debit: amount,
                    credit: 0,
                    description: expense.description
                },
                {
                    accountId: cash.id,
                    debit: 0,
                    credit: amount,
                    description: `صرف نقدي - ${expense.category}`
                }
            ];

            const entry = await accountingService.createJournalEntry({
                schoolId: expense.schoolId,
                date: expense.date || new Date().toISOString().split('T')[0],
                description: `مصروف: ${expense.description}`,
                referenceType: 'EXPENSE',
                referenceId: expense.id,
                createdBy: userId,
                lines
            });

            await accountingService.postJournalEntry(entry.id, userId);

            return entry;
        } catch (error) {
            console.error('Error creating journal entry for expense:', error);
            throw error;
        }
    }

    /**
     * Hook: When a salary is paid
     * Debit: Salary Expense
     * Credit: Cash/Bank
     */
    async onSalaryPaid(salarySlip, userId) {
        try {
            const salaryExpense = await Account.findOne({
                where: { schoolId: salarySlip.schoolId, code: '5100' } // Salary Expense
            });

            const cash = await Account.findOne({
                where: { schoolId: salarySlip.schoolId, code: '1110' }
            });

            if (!salaryExpense || !cash) {
                console.error('Required accounts not found for salary journal entry');
                return null;
            }

            const netAmount = parseFloat(salarySlip.netAmount);

            const lines = [
                {
                    accountId: salaryExpense.id,
                    debit: netAmount,
                    credit: 0,
                    description: `راتب ${salarySlip.month} - ${salarySlip.personType} ${salarySlip.personId}`
                },
                {
                    accountId: cash.id,
                    debit: 0,
                    credit: netAmount,
                    description: `صرف راتب - ${salarySlip.month}`
                }
            ];

            const entry = await accountingService.createJournalEntry({
                schoolId: salarySlip.schoolId,
                date: new Date().toISOString().split('T')[0],
                description: `راتب ${salarySlip.month} - ${salarySlip.personType} ${salarySlip.personId}`,
                referenceType: 'SALARY',
                referenceId: salarySlip.id,
                createdBy: userId,
                lines
            });

            await accountingService.postJournalEntry(entry.id, userId);

            return entry;
        } catch (error) {
            console.error('Error creating journal entry for salary:', error);
            throw error;
        }
    }
}

module.exports = new IntegrationHooks();
