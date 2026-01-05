import { apiCall, getApiBase, getAuthToken } from './core';

export const getBackups = async (): Promise<any[]> => {
    return await apiCall('/backups');
};

export const createBackup = async (): Promise<any> => {
    return await apiCall('/backups/create', { method: 'POST' });
};

export const downloadBackup = async (filename: string): Promise<Blob> => {
    const res = await fetch(`${getApiBase()}/backups/download/${filename}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    return await res.blob();
};
