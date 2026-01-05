import { apiCall, setAuthToken, setRefreshToken } from './core';
import { User } from '../types';

export const login = async (
    emailOrUsername: string,
    password: string,
    schoolId?: number,
    hcaptchaToken?: string,
): Promise<User | 'TRIAL_EXPIRED'> => {
    const body: any = { emailOrUsername, password };
    if (schoolId) body.schoolId = schoolId;
    if (hcaptchaToken) body.hcaptchaToken = hcaptchaToken;

    const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
    });

    if (response.trialExpired) return 'TRIAL_EXPIRED';

    const token = response.token;
    const refreshToken = response.refreshToken;
    if (token) {
        setAuthToken(token);
        if (refreshToken) setRefreshToken(refreshToken);
        if (response.user && response.user.schoolId) {
            localStorage.setItem('current_school_id', String(response.user.schoolId));
        }
    }
    return response.user;
};

export const logout = async (): Promise<void> => {
    try {
        await apiCall('/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn('Logout API failed, clearing local state anyway', e);
    } finally {
        setAuthToken('');
        setRefreshToken('');
        localStorage.removeItem('current_school_id');
        // Optional: window.location.href = '/login'; // Handled by caller usually
    }
};

export const getCurrentUser = async (): Promise<User> => {
    const user = await apiCall('/auth/me');
    if (user && user.schoolId) {
        localStorage.setItem('current_school_id', String(user.schoolId));
    }
    return user;
};

export const superAdminLogin = async (email: string, password: string): Promise<any> => {
    return await apiCall('/auth/superadmin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
};

export const verifySuperAdminMfa = async (tempToken: string, mfaCode: string): Promise<any> => {
    return await apiCall('/auth/superadmin/verify-mfa', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tempToken}` },
        body: JSON.stringify({ mfaCode }),
    });
};

export const requestSuperAdminReset = async (email: string): Promise<{ resetToken: string }> => {
    return await apiCall('/auth/superadmin/reset-request', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

export const resetSuperAdminPassword = async (token: string, newPassword: string): Promise<{ success: boolean }> => {
    return await apiCall('/auth/superadmin/reset-confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
    });
};
