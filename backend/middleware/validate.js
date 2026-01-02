function validate(requiredSpec) {
  return (req, res, next) => {
    const errors = [];
    for (const spec of requiredSpec) {
      let value = req.body[spec.name];
      if (typeof value === 'string') {
        const sanitized = value.replace(/[<>"'`]/g, '').trim();
        req.body[spec.name] = sanitized;
        value = sanitized;
      }
      if (spec.required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))){
        errors.push(`${spec.name} is required`);
        continue;
      }
      if (value !== undefined && spec.type) {
        if (spec.type === 'array') {
          if (!Array.isArray(value)) {
            errors.push(`${spec.name} must be an array`);
          } else if (spec.element && typeof spec.element === 'object') {
            for (const [k, rule] of Object.entries(spec.element)) {
              for (const [idx, item] of value.entries()) {
                const v = item[k];
                if (rule.required && (v === undefined || v === null || (typeof v === 'string' && v.trim() === ''))) {
                  errors.push(`${spec.name}[${idx}].${k} is required`);
                  continue;
                }
                if (v !== undefined && rule.type && typeof v !== rule.type) {
                  errors.push(`${spec.name}[${idx}].${k} must be of type ${rule.type}`);
                }
                if (v !== undefined && rule.enum && !rule.enum.includes(v)) {
                  errors.push(`${spec.name}[${idx}].${k} must be one of: ${rule.enum.join(', ')}`);
                }
              }
            }
          }
        } else if (typeof value !== spec.type) {
          errors.push(`${spec.name} must be of type ${spec.type}`);
        }
      }
      if (value !== undefined && spec.enum && !spec.enum.includes(value)) {
        errors.push(`${spec.name} must be one of: ${spec.enum.join(', ')}`);
      }
      if (value !== undefined && spec.minLength && typeof value === 'string' && value.length < spec.minLength) {
        errors.push(`${spec.name} must be at least ${spec.minLength} chars`);
      }
    }
    if (errors.length) {
      const schema = requiredSpec.map(s => {
        const out = { name: s.name };
        if (s.type) out.type = s.type;
        if (s.required) out.required = true;
        if (Array.isArray(s.enum)) out.enum = s.enum;
        if (s.minLength) out.minLength = s.minLength;
        if (s.element && typeof s.element === 'object') {
          const el = {};
          for (const [k, rule] of Object.entries(s.element)) {
            const r = {};
            if (rule.type) r.type = rule.type;
            if (rule.required) r.required = true;
            if (Array.isArray(rule.enum)) r.enum = rule.enum;
            el[k] = r;
          }
          out.element = el;
        }
        return out;
      });
      return res.error(400, 'VALIDATION_FAILED', 'Validation failed', { errors, schema });
    }
    next();
  };
}

module.exports = { validate };
