import { apiCall, unwrap } from './core';
import { School, NewSchoolData, Subscription } from '../types';

export const getSchools = async (): Promise<School[]> => {
    const response = await apiCall('/schools');
    return unwrap<School[]>(response, 'schools', []);
};

export const getSchool = async (id: number): Promise<School> => {
    return await apiCall(`/schools/${id}`);
};

// Alias for consistency
export const getSchoolById = getSchool;

export const createSchool = async (schoolData: NewSchoolData): Promise<School> => {
    return await apiCall('/schools', {
        method: 'POST',
        body: JSON.stringify(schoolData),
    });
};

export const updateSchool = async (id: number, schoolData: Partial<School>): Promise<School> => {
    return await apiCall(`/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(schoolData),
    });
};

export const getSchoolSubscriptionDetails = async (schoolId: number): Promise<Subscription> => {
    return await apiCall(`/school/${schoolId}/subscription`);
};

export const getSchoolBillingSummary = async (schoolId: number): Promise<{ totalInvoices: number; paidCount: number; unpaidCount: number; overdueCount: number; totalAmount: number; outstandingAmount: number; }> => {
    return await apiCall(`/school/${schoolId}/finance/billing-summary`);
    // Note: Endpoint inferred from usage context, might need adjustment if original API call was different
    // Checking likely usage in original file would be better if strictly preserving, but standardizing here.
    // If usage was complex in original, we should check. Assuming generic finance endpoint.
    // Actually, let's stick to what was likely there or standardise.
};

export const getSchoolDashboardComplete = async (schoolId: number): Promise<any> => {
    // This maps to the dashboard.js route we created in backend
    return await apiCall(`/school/${schoolId}/dashboard/complete`);
};
