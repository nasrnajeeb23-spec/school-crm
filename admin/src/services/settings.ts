import { apiCall } from './core';
import { SchoolSettings, SchoolEvent, NewStaffData } from '../types';

// Settings
export const getSchoolSettings = async (schoolId: number): Promise<SchoolSettings> => {
    return await apiCall(`/school/${schoolId}/settings`);
};

export const updateSchoolSettings = async (schoolId: number, settings: Partial<SchoolSettings>): Promise<SchoolSettings> => {
    return await apiCall(`/school/${schoolId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
};

export const uploadSchoolLogo = async (schoolId: number, file: File): Promise<{ logoUrl: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    return await apiCall(`/school/${schoolId}/settings/logo`, {
        method: 'POST',
        body: formData,
    });
};

// Events
export const getEvents = async (schoolId: number): Promise<SchoolEvent[]> => {
    return await apiCall(`/school/${schoolId}/events`);
};

export const createEvent = async (data: any): Promise<SchoolEvent> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/events`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteEvent = async (id: string): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/events/${id}`, { method: 'DELETE' });
};

// Staff
export const getStaff = async (schoolId: number): Promise<any[]> => {
    return await apiCall(`/school/${schoolId}/staff`);
};

export const addStaff = async (data: NewStaffData): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/staff`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updateStaff = async (id: string | number, data: Partial<NewStaffData>): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteStaff = async (id: string | number): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/staff/${id}`, { method: 'DELETE' });
};

// RBAC
export const getPermissions = async (): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/rbac/permissions`);
};

export const getRoles = async (): Promise<any> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/rbac/roles`);
};
