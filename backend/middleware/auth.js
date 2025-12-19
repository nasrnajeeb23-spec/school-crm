const jwt = require('jsonwebtoken');
const { User } = require('../models');

function ipv4(ip) {
  const m = String(ip || '').match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  return m ? m[1] : '';
}

function ipToLong(ip) {
  const parts = String(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inCidr(ip, cidr) {
  const [base, bitsStr] = String(cidr).split('/');
  const bits = Number(bitsStr);
  const ipNum = ipToLong(ip);
  const baseNum = ipToLong(base);
  if (ipNum == null || baseNum == null || isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('❌ JWT_SECRET not found in environment variables!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
})();

async function verifyToken(req, res, next) {
  const parseCookies = (cookieHeader) => {
    const out = {};
    if (!cookieHeader) return out;
    const pairs = String(cookieHeader).split(';');
    for (const p of pairs) {
      const idx = p.indexOf('=');
      if (idx === -1) continue;
      const k = p.slice(0, idx).trim();
      const v = decodeURIComponent(p.slice(idx + 1).trim());
      out[k] = v;
    }
    return out;
  };
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) {
    try {
      const cookies = parseCookies(req.headers['cookie'] || '');
      token = cookies['access_token'] || null;
    } catch {}
  }
  if (!token) return res.status(401).json({ msg: 'Missing Authorization header' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    const u = await User.findByPk(payload.id);
    if (!u || u.isActive === false) return res.status(401).json({ msg: 'User disabled' });
    const tv = Number(u.tokenVersion || 0);
    const ptv = Number(payload.tokenVersion || 0);
    if (tv !== ptv) return res.status(401).json({ msg: 'Token revoked' });
    // Enforce central security policies for SuperAdmin
    const policies = (req.app && req.app.locals && req.app.locals.securityPolicies) || null;
    const roleKey = String(u.role || '').toUpperCase().replace(/[^A-Z]/g, '');
    const isSuper = roleKey === 'SUPERADMIN';
    if (policies && isSuper) {
      // Enforce MFA: require token type issued after MFA
      if (policies.enforceMfaForAdmins && String(payload.type || '') !== 'superadmin') {
        return res.status(401).json({ msg: 'MFA required' });
      }
      // Enforce allowed IP ranges if configured
      const ranges = Array.isArray(policies.allowedIpRanges) ? policies.allowedIpRanges : [];
      if (ranges.length > 0) {
        const ipRaw = (req.headers['x-forwarded-for'] || req.ip || '').toString();
        const ip4 = ipv4(ipRaw);
        const ok = ranges.some(r => String(r).includes('/') ? inCidr(ip4, String(r)) : ip4.startsWith(String(r)));
        if (!ok) return res.status(403).json({ msg: 'IP not allowed' });
      }
      // Enforce session max age if set (override JWT exp)
      const maxH = Number(policies.sessionMaxAgeHours || 0);
      if (maxH > 0 && payload.iat) {
        const ageSec = Math.floor(Date.now() / 1000) - Number(payload.iat);
        if (ageSec > maxH * 3600) return res.status(401).json({ msg: 'Session expired' });
      }
    }
    next();
  } catch (err) {
    try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('auth_invalid_token', { path: req.originalUrl || req.url, ip: req.ip }); } catch {}
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });

    const normalizeRole = (role) => {
      if (!role) return '';
      const key = String(role).toUpperCase().replace(/[^A-Z]/g, '');
      const map = {
        SUPERADMIN: 'SUPER_ADMIN',
        SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL',
        SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL',
        SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR',
        SCHOOLADMIN: 'SCHOOL_ADMIN',
        TEACHER: 'TEACHER',
        PARENT: 'PARENT',
        STAFF: 'STAFF'
      };
      return map[key] || String(role).toUpperCase();
    };

    const userRole = normalizeRole(req.user.role);
    const allowedRolesUpper = allowedRoles.map(role => normalizeRole(role));

    if (!allowedRolesUpper.includes(userRole)) {
      try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('access_denied_role', { userId: req.user.id, role: userRole, allowed: allowedRolesUpper, path: req.originalUrl || req.url }); } catch {}
      return res.status(403).json({ msg: 'Access denied' });
    }
    next();
  };
}

function requireSameSchoolParam(paramName = 'schoolId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });

    const normalizeRole = (role) => {
      if (!role) return '';
      const key = String(role).toUpperCase().replace(/[^A-Z]/g, '');
      const map = {
        SUPERADMIN: 'SUPER_ADMIN',
        SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL',
        SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL',
        SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR',
        SCHOOLADMIN: 'SCHOOL_ADMIN',
        TEACHER: 'TEACHER',
        PARENT: 'PARENT',
        STAFF: 'STAFF'
      };
      return map[key] || String(role).toUpperCase();
    };

    // Allow all SuperAdmin roles (including team members)
    const superAdminRoles = ['SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'];
    if (superAdminRoles.includes(normalizeRole(req.user.role))) return next();

    const requestedSchoolId = parseInt(req.params[paramName], 10);
    const userSchoolId = Number(req.user.schoolId || 0);
    const matchesParam = !!requestedSchoolId && userSchoolId === requestedSchoolId;
    if (!matchesParam) {
      try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('access_denied_school', { userId: req.user.id, role: req.user.role, userSchoolId, requestedSchoolId, path: req.originalUrl || req.url }); } catch {}
      return res.status(403).json({ msg: 'Access denied for this school' });
    }
    next();
  };
}

function requirePermission(...requiredPerms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    const normalizeRole = (role) => {
      if (!role) return '';
      const key = String(role).toUpperCase().replace(/[^A-Z]/g, '');
      const map = {
        SUPERADMIN: 'SUPER_ADMIN',
        SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL',
        SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL',
        SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR',
        SCHOOLADMIN: 'SCHOOL_ADMIN',
        TEACHER: 'TEACHER',
        PARENT: 'PARENT',
        STAFF: 'STAFF'
      };
      return map[key] || String(role).toUpperCase();
    };

    const userRole = normalizeRole(req.user.role);
    const superAdminRoles = ['SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'];
    if (superAdminRoles.includes(userRole)) return next();

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const ok = requiredPerms.some(p => perms.includes(p));
    if (!ok) { 
      try { 
        const logger = req.app && req.app.locals && req.app.locals.logger; 
        if (logger) logger.warn('access_denied_permission', { userId: req.user.id, role: req.user.role, requiredPerms, path: req.originalUrl || req.url }); 
      } catch {} 
      // Return clear error message about missing permissions
      return res.status(403).json({ msg: 'Insufficient permissions', requiredPermissions: requiredPerms, userPermissions: perms }); 
    }
    next();
  };
}

function requireSameSchoolQuery(paramName = 'schoolId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });

    const normalizeRole = (role) => {
      if (!role) return '';
      const key = String(role).toUpperCase().replace(/[^A-Z]/g, '');
      const map = {
        SUPERADMIN: 'SUPER_ADMIN',
        SUPERADMINFINANCIAL: 'SUPER_ADMIN_FINANCIAL',
        SUPERADMINTECHNICAL: 'SUPER_ADMIN_TECHNICAL',
        SUPERADMINSUPERVISOR: 'SUPER_ADMIN_SUPERVISOR',
        SCHOOLADMIN: 'SCHOOL_ADMIN',
        TEACHER: 'TEACHER',
        PARENT: 'PARENT',
        STAFF: 'STAFF'
      };
      return map[key] || String(role).toUpperCase();
    };

    const superAdminRoles = ['SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'];
    if (superAdminRoles.includes(normalizeRole(req.user.role))) return next();

    const requestedSchoolId = parseInt((req.query && req.query[paramName]) || '', 10);
    const userSchoolId = Number(req.user.schoolId || 0);
    const matchesQuery = !!requestedSchoolId && userSchoolId === requestedSchoolId;
    if (!matchesQuery) {
      try { const logger = req.app && req.app.locals && req.app.locals.logger; if (logger) logger.warn('access_denied_school_query', { userId: req.user.id, role: req.user.role, userSchoolId, requestedSchoolId, path: req.originalUrl || req.url }); } catch {}
      return res.status(403).json({ msg: 'Access denied for this school' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole, requireSameSchoolParam, requirePermission, JWT_SECRET, requireSameSchoolQuery };
