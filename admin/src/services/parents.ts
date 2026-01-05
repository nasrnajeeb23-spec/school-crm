import { apiCall, unwrap } from './core';
import { Parent, NewParentData } from '../types';

export const getParents = async (schoolId: number): Promise<Parent[]> => {
    const response = await apiCall(`/school/${schoolId}/parents`);
    // Check if backend returns array directly or wrapped
    if (Array.isArray(response)) return response;
    return unwrap<Parent[]>(response, 'parents', []);
};

export const createParent = async (parentData: NewParentData): Promise<Parent> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/parents`, {
        method: 'POST',
        body: JSON.stringify(parentData),
    });
};

export const updateParent = async (parentId: string, data: Partial<Parent>): Promise<Parent> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/parents/${parentId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteParent = async (parentId: string): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/parents/${parentId}`, { method: 'DELETE' });
};
