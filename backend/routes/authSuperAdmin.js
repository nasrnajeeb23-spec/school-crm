const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { verifyToken } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const router = express.Router();

// Super Admin IP whitelist (should be in environment variables in production)
const SUPER_ADMIN_WHITELIST = process.env.SUPER_ADMIN_IP_WHITELIST ? 
  process.env.SUPER_ADMIN_IP_WHITELIST.split(',') : 
  ['127.0.0.1', '::1', '192.168.1.1', '10.0.0.1'];

// Rate limiting for SuperAdmin login attempts
const loginAttempts = new Map();
let redisClient = null;
try {
  if (process.env.REDIS_URL) {
    const redis = require('redis');
    const useTls = String(process.env.REDIS_URL || '').startsWith('rediss://');
    redisClient = redis.createClient({ url: process.env.REDIS_URL, socket: useTls ? { tls: true } : {} });
    redisClient.on('error', () => {});
    // Connect lazily; failures will fall back to in-memory
    redisClient.connect().catch(() => { redisClient = null; });
  }
} catch {}
const DEFAULT_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 3;

async function getSecurityPolicies(app) {
  const defaults = {
    enforceMfaForAdmins: true,
    passwordMinLength: 0,
    lockoutThreshold: DEFAULT_MAX_ATTEMPTS,
    allowedIpRanges: [],
    sessionMaxAgeHours: 24,
  };
  try {
    const redis = app && app.locals && app.locals.redisClient;
    if (redis && typeof redis.get === 'function') {
      const val = await redis.get('security:policies');
      if (val) {
        const cfg = JSON.parse(val);
        return { ...defaults, ...cfg };
      }
    }
  } catch {}
  const localCfg = (app && app.locals && app.locals.securityPolicies) || {};
  return { ...defaults, ...localCfg };
}

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Helper function to check if IP is whitelisted
const isWhitelistedIP = (ip) => {
  return SUPER_ADMIN_WHITELIST.includes(ip);
};

// Helper function to perform security check
const performSecurityCheck = (ip, userAgent) => {
  const isWhitelisted = isWhitelistedIP(ip);
  const isSuspiciousUserAgent = userAgent && (
    userAgent.includes('bot') || 
    userAgent.includes('crawler') ||
    userAgent.includes('curl') ||
    userAgent.includes('wget')
  );
  const isUnknownDevice = userAgent && !(
    userAgent.includes('Chrome') || 
    userAgent.includes('Firefox') || 
    userAgent.includes('Safari') ||
    userAgent.includes('Edge')
  );

  if (isWhitelisted) {
    return {
      allowed: true,
      riskLevel: 'low',
      requiresAdditionalVerification: false,
      suggestedAction: 'allow'
    };
  }

  if (isSuspiciousUserAgent) {
    return {
      allowed: false,
      reason: 'Suspicious user agent detected',
      riskLevel: 'high',
      requiresAdditionalVerification: true,
      suggestedAction: 'block'
    };
  }

  if (isUnknownDevice) {
    return {
      allowed: true,
      riskLevel: 'medium',
      requiresAdditionalVerification: true,
      suggestedAction: 'require_mfa'
    };
  }

  return {
    allowed: true,
    riskLevel: 'low',
    requiresAdditionalVerification: false,
    suggestedAction: 'allow'
  };
};

// Helper function to log SuperAdmin actions
const logSuperAdminAction = async (action, details, req) => {
  try {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    await AuditLog.create({
      action: `superadmin.${action}`,
      userId: details.userId || null,
      userEmail: details.userEmail || null,
      ipAddress: ip,
      userAgent: userAgent,
      details: JSON.stringify(details),
      timestamp: new Date(),
      riskLevel: details.riskLevel || 'low'
    });
  } catch (error) {
    console.error('Failed to log SuperAdmin action:', error);
  }
};

// Check rate limiting (supports Redis if available)
const checkRateLimit = async (identifier, maxAttempts = DEFAULT_MAX_ATTEMPTS, lockoutMs = DEFAULT_LOCKOUT_DURATION) => {
  if (redisClient) {
    try {
      const lockKey = `sa:login:${identifier}:lock`;
      const ttl = await redisClient.ttl(lockKey);
      if (ttl && ttl > 0) {
        const attempts = parseInt(await redisClient.get(`sa:login:${identifier}:count`) || '0');
        return { allowed: false, remainingTime: ttl, attempts };
      }
      const attempts = parseInt(await redisClient.get(`sa:login:${identifier}:count`) || '0');
      return { allowed: true, attempts };
    } catch {}
  }
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  if (attempts && attempts.count >= maxAttempts) {
    const timeDiff = now - attempts.lastAttempt;
    if (timeDiff < lockoutMs) {
      const remainingTime = Math.ceil((LOCKOUT_DURATION - timeDiff) / 1000);
      return { allowed: false, remainingTime, attempts: attempts.count };
    } else {
      loginAttempts.delete(identifier);
    }
  }
  return { allowed: true, attempts: attempts?.count || 0 };
};

// Increment rate limit counter (supports Redis if available)
const incrementRateLimit = async (identifier, maxAttempts = DEFAULT_MAX_ATTEMPTS, lockoutMs = DEFAULT_LOCKOUT_DURATION) => {
  if (redisClient) {
    try {
      const countKey = `sa:login:${identifier}:count`;
      const lockKey = `sa:login:${identifier}:lock`;
      const attempts = await redisClient.incr(countKey);
      await redisClient.set(`sa:login:${identifier}:last`, String(Date.now()));
      if (attempts >= maxAttempts) {
        const seconds = Math.ceil(lockoutMs / 1000);
        await redisClient.setEx(lockKey, seconds, '1');
      }
      return attempts;
    } catch {}
  }
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: now };
  attempts.count += 1;
  attempts.lastAttempt = now;
  loginAttempts.set(identifier, attempts);
  return attempts.count;
};

const clearRateLimit = async (identifier) => {
  if (redisClient) {
    try {
      await redisClient.del(`sa:login:${identifier}:count`);
      await redisClient.del(`sa:login:${identifier}:lock`);
      await redisClient.del(`sa:login:${identifier}:last`);
    } catch {}
  }
  loginAttempts.delete(identifier);
};

// @route   POST /api/auth/superadmin/login
// @desc    SuperAdmin login with enhanced security
// @access  Public (with IP restrictions)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isString(),
  body('ipAddress').optional().isIP(),
  body('userAgent').optional().isString(),
  body('timestamp').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input data',
        errors: errors.array() 
      });
    }

    const { email, password, ipAddress, userAgent, timestamp } = req.body;
    const clientIP = ipAddress || getClientIP(req);
    const clientUserAgent = userAgent || req.headers['user-agent'];

    // Security check
    const securityCheck = performSecurityCheck(clientIP, clientUserAgent);
    
    if (!securityCheck.allowed) {
      await logSuperAdminAction('login.blocked', {
        email,
        reason: securityCheck.reason,
        riskLevel: securityCheck.riskLevel,
        ipAddress: clientIP,
        userAgent: clientUserAgent
      }, req);
      
      return res.status(403).json({
        success: false,
        message: `Access denied: ${securityCheck.reason}`,
        auditLog: {
          loginId: `login_${Date.now()}`,
          sessionId: `session_${Date.now()}`,
          ipAddress: clientIP,
          location: 'Unknown',
          device: clientUserAgent || 'Unknown',
          riskLevel: securityCheck.riskLevel
        }
      });
    }

    // Central security policies
    const policies = await getSecurityPolicies(req.app);
    const maxAttempts = Number(policies.lockoutThreshold || DEFAULT_MAX_ATTEMPTS) || DEFAULT_MAX_ATTEMPTS;
    const lockoutMs = DEFAULT_LOCKOUT_DURATION;

    // Rate limiting check
    const rateLimit = await checkRateLimit(email, maxAttempts, lockoutMs);
    if (!rateLimit.allowed) {
      await logSuperAdminAction('login.rate_limited', {
        email,
        attempts: rateLimit.attempts,
        remainingTime: rateLimit.remainingTime,
        ipAddress: clientIP
      }, req);
      
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed attempts',
        remainingTime: rateLimit.remainingTime
      });
    }

    // Find SuperAdmin user
    const user = await User.findOne({ 
      where: { 
        email: email,
        role: 'SuperAdmin'
      }
    });

    if (!user) {
      await incrementRateLimit(email);
      
      await logSuperAdminAction('login.failed', {
        email,
        reason: 'Invalid credentials',
        attempts: rateLimit.attempts + 1,
        ipAddress: clientIP
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const attempts = await incrementRateLimit(email, maxAttempts, lockoutMs);
      
      await logSuperAdminAction('login.failed', {
        userId: user.id,
        userEmail: user.email,
        reason: 'Invalid password',
        attempts: attempts,
        ipAddress: clientIP
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        remainingAttempts: Math.max(0, maxAttempts - attempts)
      });
    }

    // Check if MFA is required
    const requiresMfa = ((String(user.role).toUpperCase() === 'SUPERADMIN' && !!user.mfaEnabled) || securityCheck.requiresAdditionalVerification || (policies.enforceMfaForAdmins === true));
    const tempToken = requiresMfa ? 
      jwt.sign({ userId: user.id, type: 'temp' }, JWT_SECRET, { expiresIn: '5m' }) : 
      undefined;

    // Clear rate limit on successful login
    await clearRateLimit(email);

    // Log successful login attempt
    await logSuperAdminAction('login.attempt', {
      userId: user.id,
      userEmail: user.email,
      requiresMfa,
      riskLevel: securityCheck.riskLevel,
      ipAddress: clientIP
    }, req);

    res.json({
      success: true,
      message: requiresMfa ? 'MFA verification required' : 'Login successful',
      requiresMfa,
      tempToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin,
        loginAttempts: 0,
        isLocked: false
      },
      auditLog: {
        loginId: `login_${Date.now()}`,
        sessionId: `session_${Date.now()}`,
        ipAddress: clientIP,
        location: 'Unknown',
        device: clientUserAgent || 'Unknown',
        riskLevel: securityCheck.riskLevel
      }
    });

  } catch (error) {
    console.error('SuperAdmin login error:', error);
    
    await logSuperAdminAction('login.error', {
      email: req.body.email,
      error: error.message,
      ipAddress: getClientIP(req)
    }, req);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// @route   POST /api/auth/superadmin/verify-mfa
// @desc    Verify MFA code for SuperAdmin
// @access  Public (with temp token)
router.post('/verify-mfa', [
  body('tempToken').isString(),
  body('mfaCode').isString().isLength({ min: 6, max: 6 }),
  body('ipAddress').optional().isIP(),
  body('timestamp').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input data',
        errors: errors.array() 
      });
    }

    const { tempToken, mfaCode, ipAddress } = req.body;
    const clientIP = ipAddress || getClientIP(req);

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (error) {
      await logSuperAdminAction('mfa_verify.invalid_token', {
        tempToken,
        reason: 'Invalid or expired token',
        ipAddress: clientIP
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    if (decoded.type !== 'temp') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user || user.role !== 'SuperAdmin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid user'
      });
    }

    const isDev = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
    const allowDevCodes = isDev || String(process.env.ALLOW_DEV_MFA_CODES || '').toLowerCase() === 'true';
    let otpValid = false;
    if (user.mfaSecret) {
      otpValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode,
        window: 1
      });
    } else if (allowDevCodes) {
      const validCodes = ['123456', '654321', '000000'];
      otpValid = validCodes.includes(mfaCode);
    } else {
      otpValid = false;
    }

    if (!otpValid) {
      await logSuperAdminAction('mfa_verify.failed', {
        userId: user.id,
        userEmail: user.email,
        reason: 'Invalid MFA code',
        ipAddress: clientIP
      }, req);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid MFA code'
      });
    }

    // Generate session token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        type: 'superadmin'
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Log successful MFA verification
    await logSuperAdminAction('mfa_verify.success', {
      userId: user.id,
      userEmail: user.email,
      sessionId,
      ipAddress: clientIP
    }, req);

    res.json({
      success: true,
      message: 'MFA verification successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ipAddress: clientIP,
        userAgent: req.headers['user-agent']
      }
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    
    await logSuperAdminAction('mfa_verify.error', {
      tempToken: req.body.tempToken,
      error: error.message,
      ipAddress: getClientIP(req)
    }, req);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during MFA verification'
    });
  }
});

// @route   GET /api/auth/superadmin/security-status
// @desc    Get security status for current IP
// @access  Public
router.get('/superadmin/security-status', (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    const securityCheck = performSecurityCheck(clientIP, userAgent);
    
    res.json({
      allowed: securityCheck.allowed,
      riskLevel: securityCheck.riskLevel,
      requiresAdditionalVerification: securityCheck.requiresAdditionalVerification,
      suggestedAction: securityCheck.suggestedAction,
      reason: securityCheck.reason,
      ipAddress: clientIP,
      isWhitelisted: isWhitelistedIP(clientIP)
    });
    
  } catch (error) {
    console.error('Security status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/auth/superadmin/logout
// @desc    SuperAdmin logout
// @access  Private (SuperAdmin only)
router.post('/superadmin/logout', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const sessionId = req.headers['x-session-id'];
    
    await logSuperAdminAction('logout', {
      userId: req.user.id,
      userEmail: req.user.email,
      sessionId: sessionId || 'unknown',
      ipAddress: getClientIP(req)
    }, req);

    res.json({
      success: true,
      message: 'SuperAdmin logged out successfully'
    });
    
  } catch (error) {
    console.error('SuperAdmin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }
    const user = await User.findByPk(req.user.id);
    if (!user || String(user.role).toUpperCase() !== 'SUPERADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const policies = await getSecurityPolicies(req.app);
    
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });
    await AuditLog.create({ action: 'superadmin.password.change', userId: user.id, userEmail: user.email, ipAddress: req.headers['x-forwarded-for'] || req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({}), timestamp: new Date(), riskLevel: 'low' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await User.findOne({ where: { email, role: 'SuperAdmin' } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const token = jwt.sign({ userId: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '10m' });
    if (req.app.locals.redisClient) {
      await req.app.locals.redisClient.setEx(`sa:reset:${user.id}`, 600, token).catch(() => {});
    }
    res.json({ success: true, resetToken: token });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Invalid input' });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
    if (decoded.type !== 'reset') return res.status(401).json({ success: false, message: 'Invalid token type' });
    const user = await User.findByPk(decoded.userId);
    if (!user || user.role !== 'SuperAdmin') return res.status(404).json({ success: false, message: 'User not found' });
    const policies = await getSecurityPolicies(req.app);
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });
    await AuditLog.create({ action: 'superadmin.password.reset', userId: user.id, userEmail: user.email, ipAddress: req.headers['x-forwarded-for'] || req.ip, userAgent: req.headers['user-agent'], details: JSON.stringify({}), timestamp: new Date(), riskLevel: 'medium' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// MFA management
router.post('/mfa/setup', verifyToken, async (req, res) => {
  try {
    if (String(req.user.role).toUpperCase() !== 'SUPERADMIN') return res.status(403).json({ success: false, message: 'Access denied' });
    const secret = speakeasy.generateSecret({ length: 20, name: 'SchoolSaaS' });
    res.json({ success: true, base32: secret.base32, otpauthUrl: secret.otpauth_url });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/mfa/enable', verifyToken, async (req, res) => {
  try {
    const { secret, code } = req.body || {};
    const user = await User.findByPk(req.user.id);
    if (!user || String(user.role).toUpperCase() !== 'SUPERADMIN') return res.status(403).json({ success: false, message: 'Access denied' });
    const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid code' });
    await user.update({ mfaSecret: secret, mfaEnabled: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/mfa/disable', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || String(user.role).toUpperCase() !== 'SUPERADMIN') return res.status(403).json({ success: false, message: 'Access denied' });
    await user.update({ mfaEnabled: false });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
