import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://school-crschool-crm-backendm.onrender.com/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/auth/enterprise`,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const enterpriseAPI = {
  // SAML Authentication
  initiateSAMLLogin: async () => {
    const response = await api.get('/saml/login');
    return response.data;
  },

  getSAMLMetadata: async () => {
    const response = await api.get('/saml/metadata');
    return response.data;
  },

  // Multi-Factor Authentication
  setupMFA: async (type: string = 'totp') => {
    const response = await api.post('/mfa/setup', { type });
    return response.data;
  },

  verifyMFASetup: async (token: string, backupCodes?: string[]) => {
    const response = await api.post('/mfa/verify-setup', { token, backupCodes });
    return response.data;
  },

  verifyMFAToken: async (token: string, rememberDevice: boolean = false) => {
    const response = await api.post('/mfa/verify', { token, rememberDevice });
    return response.data;
  },

  disableMFA: async (verificationToken?: string) => {
    const response = await api.post('/mfa/disable', { verificationToken });
    return response.data;
  },

  regenerateBackupCodes: async (verificationToken: string) => {
    const response = await api.post('/mfa/backup-codes/regenerate', { verificationToken });
    return response.data;
  },

  getMFAStatus: async () => {
    const response = await api.get('/mfa/status');
    return response.data;
  },

  // OAuth Integrations
  initiateGoogleAuth: async () => {
    const response = await api.get('/google/authorize');
    return response.data;
  },

  initiateMicrosoftAuth: async () => {
    const response = await api.get('/microsoft/authorize');
    return response.data;
  },

  disconnectOAuth: async (provider: 'google' | 'microsoft') => {
    const response = await api.post('/oauth/disconnect', { provider });
    return response.data;
  },

  getOAuthStatus: async () => {
    const response = await api.get('/oauth/status');
    return response.data;
  },

  refreshOAuthTokens: async (provider: 'google' | 'microsoft') => {
    const response = await api.post('/oauth/refresh', { provider });
    return response.data;
  },

  // Enterprise Status
  getEnterpriseStatus: async () => {
    const response = await api.get('/enterprise/status');
    return response.data;
  },

  // Compliance and Audit
  getAuditLogs: async (filters?: any) => {
    const params = new URLSearchParams(filters || {});
    const response = await api.get(`/audit-logs?${params.toString()}`);
    return response.data;
  },

  exportAuditLogs: async (format: string = 'csv', filters?: any) => {
    const response = await api.post('/audit-logs/export', { format, filters });
    return response.data;
  },

  // Security Settings
  getSecuritySettings: async () => {
    const response = await api.get('/security/settings');
    return response.data;
  },

  updateSecuritySettings: async (settings: any) => {
    const response = await api.put('/security/settings', settings);
    return response.data;
  },

  // Session Management
  getActiveSessions: async () => {
    const response = await api.get('/sessions/active');
    return response.data;
  },

  terminateSession: async (sessionId: string) => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  terminateAllSessions: async (keepCurrent: boolean = true) => {
    const response = await api.delete('/sessions/all', { data: { keepCurrent } });
    return response.data;
  },

  // API Key Management
  getAPIKeys: async () => {
    const response = await api.get('/api-keys');
    return response.data;
  },

  createAPIKey: async (name: string, permissions: string[]) => {
    const response = await api.post('/api-keys', { name, permissions });
    return response.data;
  },

  revokeAPIKey: async (keyId: string) => {
    const response = await api.delete(`/api-keys/${keyId}`);
    return response.data;
  },

  // Integration Health
  getIntegrationHealth: async () => {
    const response = await api.get('/integrations/health');
    return response.data;
  },

  testIntegration: async (integration: string) => {
    const response = await api.post(`/integrations/${integration}/test`);
    return response.data;
  },

  // Compliance Reports
  getComplianceReport: async (standard: string, period: string) => {
    const response = await api.get(`/compliance/${standard}/report?period=${period}`);
    return response.data;
  },

  exportComplianceReport: async (standard: string, period: string, format: string = 'pdf') => {
    const response = await api.post(`/compliance/${standard}/export`, { period, format });
    return response.data;
  },

  // Enterprise Configuration
  getEnterpriseConfig: async () => {
    const response = await api.get('/config/enterprise');
    return response.data;
  },

  updateEnterpriseConfig: async (config: any) => {
    const response = await api.put('/config/enterprise', config);
    return response.data;
  },

  // Branding and Customization
  getBrandingSettings: async () => {
    const response = await api.get('/branding');
    return response.data;
  },

  updateBrandingSettings: async (branding: any) => {
    const response = await api.put('/branding', branding);
    return response.data;
  },

  // Webhook Management
  getWebhooks: async () => {
    const response = await api.get('/webhooks');
    return response.data;
  },

  createWebhook: async (webhook: any) => {
    const response = await api.post('/webhooks', webhook);
    return response.data;
  },

  updateWebhook: async (webhookId: string, webhook: any) => {
    const response = await api.put(`/webhooks/${webhookId}`, webhook);
    return response.data;
  },

  deleteWebhook: async (webhookId: string) => {
    const response = await api.delete(`/webhooks/${webhookId}`);
    return response.data;
  },

  testWebhook: async (webhookId: string) => {
    const response = await api.post(`/webhooks/${webhookId}/test`);
    return response.data;
  }
};

export default enterpriseAPI;