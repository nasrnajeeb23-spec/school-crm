function validate(requiredSpec) {
  return (req, res, next) => {
    const errors = [];
    for (const spec of requiredSpec) {
      const value = req.body[spec.name];
      if (spec.required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))){
        errors.push(`${spec.name} is required`);
        continue;
      }
      if (value !== undefined && spec.type && typeof value !== spec.type) {
        errors.push(`${spec.name} must be of type ${spec.type}`);
      }
      if (value !== undefined && spec.enum && !spec.enum.includes(value)) {
        errors.push(`${spec.name} must be one of: ${spec.enum.join(', ')}`);
      }
      if (value !== undefined && spec.minLength && typeof value === 'string' && value.length < spec.minLength) {
        errors.push(`${spec.name} must be at least ${spec.minLength} chars`);
      }
    }
    if (errors.length) return res.status(400).json({ msg: 'Validation failed', errors });
    next();
  };
}

module.exports = { validate };