function requireModule(moduleId) {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next();
    try {
      const allowed = req.app?.locals?.allowedModules || [];
      if (!allowed.includes(moduleId)) {
        return res.status(403).json({ msg: `Module ${moduleId} not licensed` });
      }
      next();
    } catch {
      return res.status(403).json({ msg: `Module ${moduleId} not licensed` });
    }
  };
}

module.exports = { requireModule };