const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('❌ JWT_SECRET not found in environment variables!');
  console.error('Please set JWT_SECRET in your .env file');
  process.exit(1);
})();

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ msg: 'Missing Authorization header' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ msg: 'Invalid Authorization header format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    const u = await User.findByPk(payload.id);
    if (!u || u.isActive === false) return res.status(401).json({ msg: 'User disabled' });
    const tv = Number(u.tokenVersion || 0);
    const ptv = Number(payload.tokenVersion || 0);
    if (tv !== ptv) return res.status(401).json({ msg: 'Token revoked' });
    next();
  } catch (err) {
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
        PARENT: 'PARENT'
      };
      return map[key] || String(role).toUpperCase();
    };

    const userRole = normalizeRole(req.user.role);
    const allowedRolesUpper = allowedRoles.map(role => normalizeRole(role));

    if (!allowedRolesUpper.includes(userRole)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    next();
  };
}

function requireSameSchoolParam(paramName = 'schoolId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    
    // Allow all SuperAdmin roles (including team members)
    const superAdminRoles = ['SUPER_ADMIN', 'SUPER_ADMIN_FINANCIAL', 'SUPER_ADMIN_TECHNICAL', 'SUPER_ADMIN_SUPERVISOR'];
    if (superAdminRoles.includes(req.user.role.toUpperCase())) return next();
    
    const requestedSchoolId = parseInt(req.params[paramName], 10);
    if (!requestedSchoolId || req.user.schoolId !== requestedSchoolId) {
      return res.status(403).json({ msg: 'Access denied for this school' });
    }
    next();
  };
}

function requirePermission(...requiredPerms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthenticated' });
    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const ok = requiredPerms.some(p => perms.includes(p));
    if (!ok) return res.status(403).json({ msg: 'Insufficient permissions' });
    next();
  };
}

module.exports = { verifyToken, requireRole, requireSameSchoolParam, requirePermission, JWT_SECRET };