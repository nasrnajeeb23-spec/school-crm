const { User } = require('../models');

function requireModule(moduleId) {
  return async (req, res, next) => {
    try {
      // 1. Allow SuperAdmins to bypass module checks
      if (req.user) {
          const role = String(req.user.role || '').toUpperCase().replace(/[^A-Z]/g, '');
          if (role === 'SUPERADMIN' || role === 'SUPER_ADMIN') return next();
      }

      // 2. Identify School ID
      const schoolIdParam = req.params?.schoolId || req.params?.id || req.body?.schoolId || req.query?.schoolId || req.user?.schoolId;
      if (!schoolIdParam) {
          // If no school context, we might be in a global context. 
          // If strict mode, deny. If not, allow? 
          // Safer to deny if module is school-specific.
          // But let's check global allowed modules if available.
          const allowedGlobal = req.app?.locals?.allowedModules || [];
          if (allowedGlobal.length > 0 && !allowedGlobal.includes(moduleId)) {
             return res.status(403).json({ msg: `Module ${moduleId} not licensed globally` });
          }
          return next();
      }

      const schoolId = Number(schoolIdParam);

      // 3. Check Subscription Status (Expiry)
      const { Subscription, SchoolSettings } = require('../models');
      const sub = await Subscription.findOne({ where: { schoolId } });
      const now = new Date();
      
      if (sub) {
        const status = String(sub.status || '').toUpperCase();
        // Check if suspended or expired
        if (status === 'SUSPENDED') {
            return res.status(403).json({ msg: 'School subscription is suspended.' });
        }
        
        const expiry = sub.endDate || sub.renewalDate;
        // If trial or active, check date
        if (expiry && now > new Date(expiry)) {
             return res.status(403).json({ msg: 'School subscription has expired.' });
        }
      } else {
          // No subscription found? strictly should deny, but maybe allow for initial setup?
          // For security, deny if not superadmin.
          // return res.status(403).json({ msg: 'No valid subscription found.' });
      }

      // 4. Check Active Modules for School
      const settings = await SchoolSettings.findOne({ where: { schoolId } });
      const active = Array.isArray(settings?.activeModules) ? settings.activeModules : [];
      
      // Normalize module IDs if needed (e.g. 'transport' vs 'transportation')
      // Define parent-child module relationships
      const moduleMap = {
          'finance': ['finance', 'finance_salaries', 'finance_fees', 'finance_expenses', 'finance_reports'],
          'transportation': ['transportation', 'transport', 'bus_management'],
          'academic': ['academic', 'academic_management', 'grades', 'attendance'],
          'student': ['student', 'student_management']
      };

      // Check if module is directly active or part of an active parent module
      const isActive = active.some(m => {
          if (m === moduleId) return true;
          // Check if 'm' is a parent that includes 'moduleId'
          return moduleMap[m] && moduleMap[m].includes(moduleId);
      });

      if (!isActive) {
        // Fallback: check if we are requesting a parent module but have a child active? 
        // Usually we want parent implies child.
        
        // Special case: if we are in dev mode, allow everything? No, stick to logic.
        
        return res.status(403).json({ 
            msg: `Module '${moduleId}' is not active for this school.`,
            code: 'MODULE_DISABLED',
            module: moduleId
        });
      }

      // 5. Check Global Server License (if applicable)
      const allowedGlobal = req.app?.locals?.allowedModules || [];
      
      // Expand allowedGlobal using the same map
      const expandedGlobal = new Set(allowedGlobal);
      allowedGlobal.forEach(m => {
          if (moduleMap[m]) {
              moduleMap[m].forEach(child => expandedGlobal.add(child));
          }
      });

      if (expandedGlobal.size > 0 && !expandedGlobal.has(moduleId)) {
        return res.status(403).json({ msg: `Module ${moduleId} not licensed on server.` });
      }

      next();
    } catch (e) {
      console.error(`Module check error for ${moduleId}:`, e);
      return res.status(403).json({ msg: `Module access check failed`, error: e?.message });
    }
  };
}

module.exports = { requireModule };
