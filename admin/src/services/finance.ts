import { apiCall } from './core';
import { Invoice, NewInvoiceData, Expense, NewExpenseData, FeeSetup, TeacherSalarySlip } from '../types';

// Invoices
export const getInvoices = async (schoolId: number): Promise<Invoice[]> => {
    return await apiCall(`/school/${schoolId}/finance/invoices`);
};

export const generateInvoices = async (data: { feeId?: string, targetGrade?: string, targetStudentId?: string, manualAmount?: number, title?: string }): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/finance/invoices/generate`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Expenses
export const getExpenses = async (schoolId: number): Promise<Expense[]> => {
    return await apiCall(`/school/${schoolId}/finance/expenses`);
};

export const addExpense = async (data: NewExpenseData): Promise<Expense> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/finance/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Fees
export const getFeesSetup = async (schoolId: number): Promise<FeeSetup[]> => {
    return await apiCall(`/school/${schoolId}/finance/fees`);
};

export const addFeeSetup = async (data: Partial<FeeSetup>): Promise<FeeSetup> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/finance/fees`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Payroll
export const getSalaryStructures = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/payroll/structures`);
};

export const createSalaryStructure = async (data: any): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/payroll/structures`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const runPayroll = async (month: number, year: number): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/payroll/generate`, {
        method: 'POST',
        body: JSON.stringify({ month, year }),
    });
};

export const getSalarySlips = async (month?: number, year?: number): Promise<TeacherSalarySlip[]> => {
    const sid = localStorage.getItem('current_school_id');
    const query = new URLSearchParams();
    if (month) query.append('month', String(month));
    if (year) query.append('year', String(year));
    return await apiCall(`/school/${sid}/payroll/slips?${query.toString()}`);
};

export const paySalarySlip = async (slipId: string, receipt?: File): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    const formData = new FormData();
    if (receipt) formData.append('receipt', receipt);
    return await apiCall(`/school/${sid}/payroll/slips/${slipId}/pay`, {
        method: 'PUT',
        body: receipt ? formData : undefined, // apiCall handles Content-Type check
    });
};
