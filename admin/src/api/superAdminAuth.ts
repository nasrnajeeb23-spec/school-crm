import { networkDelay } from '../utils/networkDelay';
import { apiCall } from '../api';

export interface SuperAdminLoginRequest {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
}

export interface SuperAdminLoginResponse {
  success: boolean;
  message: string;
  requiresMfa?: boolean;
  tempToken?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'SuperAdmin';
    lastLogin: string;
    loginAttempts: number;
    isLocked: boolean;
  };
  auditLog?: {
    loginId: string;
    sessionId: string;
    ipAddress: string;
    location: string;
    device: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface MfaVerificationRequest {
  tempToken: string;
  mfaCode: string;
  ipAddress: string;
  timestamp: number;
}

export interface MfaVerificationResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'SuperAdmin';
    permissions: string[];
  };
  sessionInfo?: {
    sessionId: string;
    expiresAt: string;
    ipAddress: string;
    userAgent: string;
  };
}

export interface SecurityCheckResponse {
  allowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresAdditionalVerification: boolean;
  suggestedAction?: 'allow' | 'block' | 'require_mfa' | 'require_verification';
}

// Mock data for testing
const SUPER_ADMIN_WHITELIST = [
  '127.0.0.1',
  '::1',
  '192.168.1.1',
  '10.0.0.1'
];

const DEMO_SUPER_ADMIN = {
  id: 1,
  email: 'super@admin.com',
  name: 'Super Administrator',
  role: 'SuperAdmin' as const,
  password: 'password',
  mfaEnabled: true,
  mfaSecret: 'JBSWY3DPEHPK3PXP',
  lastLogin: new Date().toISOString(),
  loginAttempts: 0,
  isLocked: false
};

// Simulate security checks
const performSecurityCheck = (ipAddress: string, userAgent: string): SecurityCheckResponse => {
  const isWhitelisted = SUPER_ADMIN_WHITELIST.includes(ipAddress);
  const isSuspiciousUserAgent = userAgent.includes('bot') || userAgent.includes('crawler');
  const isUnknownDevice = !userAgent.includes('Chrome') && !userAgent.includes('Firefox') && !userAgent.includes('Safari');

  if (isWhitelisted) {
    return {
      allowed: true,
      riskLevel: 'low',
      requiresAdditionalVerification: false,
      suggestedAction: 'allow'
    };
  }

  if (isSuspiciousUserAgent || isUnknownDevice) {
    return {
      allowed: false,
      reason: 'Suspicious user agent detected',
      riskLevel: 'high',
      requiresAdditionalVerification: true,
      suggestedAction: 'block'
    };
  }

  return {
    allowed: true,
    riskLevel: 'medium',
    requiresAdditionalVerification: true,
    suggestedAction: 'require_mfa'
  };
};

// Generate location from IP (mock)
const getLocationFromIP = (ipAddress: string): string => {
  const locations: { [key: string]: string } = {
    '127.0.0.1': 'Localhost',
    '::1': 'Localhost',
    '192.168.1.1': 'Private Network',
    '10.0.0.1': 'Private Network'
  };
  return locations[ipAddress] || 'Unknown Location';
};

// Parse device info from user agent
const getDeviceInfo = (userAgent: string): string => {
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS Device';
  return 'Unknown Device';
};

export const superAdminLogin = async (request: SuperAdminLoginRequest): Promise<SuperAdminLoginResponse> => {
  await networkDelay(1000); // Simulate network delay

  // Security check
  const securityCheck = performSecurityCheck(request.ipAddress, request.userAgent);
  
  if (!securityCheck.allowed) {
    return {
      success: false,
      message: `Access denied: ${securityCheck.reason}`,
      auditLog: {
        loginId: `login_${Date.now()}`,
        sessionId: `session_${Date.now()}`,
        ipAddress: request.ipAddress,
        location: getLocationFromIP(request.ipAddress),
        device: getDeviceInfo(request.userAgent),
        riskLevel: securityCheck.riskLevel
      }
    };
  }

  // Validate credentials
  if (request.email !== DEMO_SUPER_ADMIN.email || request.password !== DEMO_SUPER_ADMIN.password) {
    return {
      success: false,
      message: 'Invalid email or password',
      auditLog: {
        loginId: `login_${Date.now()}`,
        sessionId: `session_${Date.now()}`,
        ipAddress: request.ipAddress,
        location: getLocationFromIP(request.ipAddress),
        device: getDeviceInfo(request.userAgent),
        riskLevel: securityCheck.riskLevel
      }
    };
  }

  // Check if MFA is required
  const requiresMfa = DEMO_SUPER_ADMIN.mfaEnabled && securityCheck.requiresAdditionalVerification;
  const tempToken = requiresMfa ? `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;

  return {
    success: true,
    message: requiresMfa ? 'MFA verification required' : 'Login successful',
    requiresMfa,
    tempToken,
    user: {
      id: DEMO_SUPER_ADMIN.id,
      email: DEMO_SUPER_ADMIN.email,
      name: DEMO_SUPER_ADMIN.name,
      role: DEMO_SUPER_ADMIN.role,
      lastLogin: DEMO_SUPER_ADMIN.lastLogin,
      loginAttempts: DEMO_SUPER_ADMIN.loginAttempts,
      isLocked: DEMO_SUPER_ADMIN.isLocked
    },
    auditLog: {
      loginId: `login_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
      ipAddress: request.ipAddress,
      location: getLocationFromIP(request.ipAddress),
      device: getDeviceInfo(request.userAgent),
      riskLevel: securityCheck.riskLevel
    }
  };
};

export const verifySuperAdminMfa = async (request: MfaVerificationRequest): Promise<MfaVerificationResponse> => {
  await networkDelay(800);

  // Validate temp token
  if (!request.tempToken.startsWith('temp_')) {
    return {
      success: false,
      message: 'Invalid or expired session'
    };
  }

  // Validate MFA code (demo: accept '123456' or authenticator code)
  const validCodes = ['123456', '654321', '000000'];
  if (!validCodes.includes(request.mfaCode)) {
    return {
      success: false,
      message: 'Invalid MFA code'
    };
  }

  // Generate session token
  const token = `superadmin_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`;
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    message: 'MFA verification successful',
    token,
    user: {
      id: DEMO_SUPER_ADMIN.id,
      email: DEMO_SUPER_ADMIN.email,
      name: DEMO_SUPER_ADMIN.name,
      role: DEMO_SUPER_ADMIN.role,
      permissions: [
        'platform.manage',
        'schools.manage',
        'users.manage',
        'finance.manage',
        'reports.view',
        'settings.manage',
        'audit.view',
        'backup.manage'
      ]
    },
    sessionInfo: {
      sessionId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      ipAddress: request.ipAddress,
      userAgent: navigator.userAgent
    }
  };
};

export const getSuperAdminSecurityStatus = async (ipAddress: string): Promise<SecurityCheckResponse> => {
  await networkDelay(300);
  return performSecurityCheck(ipAddress, navigator.userAgent);
};

export const logoutSuperAdmin = async (sessionId: string): Promise<{ success: boolean; message: string }> => {
  await networkDelay(500);
  return {
    success: true,
    message: 'SuperAdmin logged out successfully'
  };
};

// Audit logging functions
export const logSuperAdminAction = async (action: string, details: any): Promise<void> => {
  await networkDelay(200);
  console.log(`[SUPERADMIN AUDIT] ${new Date().toISOString()} - Action: ${action}`, details);
};

export const getSuperAdminAuditLogs = async (filters?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  userId?: number;
}): Promise<any[]> => {
  const query = new URLSearchParams();
  if (filters?.startDate) query.append('startDate', filters.startDate);
  if (filters?.endDate) query.append('endDate', filters.endDate);
  if (filters?.action) query.append('action', filters.action);
  if (filters?.userId) query.append('userId', String(filters.userId));

  return await apiCall(`/superadmin/audit-logs?${query.toString()}`, { method: 'GET' });
};