// API helper to add missing functions
import { apiCall } from './api';

// Contact Messages APIs
export const getContactMessages = async (): Promise<any[]> => {
    return await apiCall('/contact', { method: 'GET' });
};

export const updateContactMessage = async (id: string, data: { status?: string }): Promise<any> => {
    return await apiCall(`/contact/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

export const deleteContactMessage = async (id: string): Promise<void> => {
    await apiCall(`/contact/${id}`, { method: 'DELETE' });
};

// SuperAdmin Team Management APIs (already exist in backend)
export const createSuperAdminTeamMember = async (data: any): Promise<any> => {
    return await apiCall('/superadmin/team', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const updateSuperAdminTeamMember = async (id: string, data: any): Promise<any> => {
    return await apiCall(`/superadmin/team/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

export const deleteSuperAdminTeamMember = async (id: string): Promise<void> => {
    await apiCall(`/superadmin/team/${id}`, { method: 'DELETE' });
};

// Export all
export default {
    getContactMessages,
    updateContactMessage,
    deleteContactMessage,
    createSuperAdminTeamMember,
    updateSuperAdminTeamMember,
    deleteSuperAdminTeamMember
};
