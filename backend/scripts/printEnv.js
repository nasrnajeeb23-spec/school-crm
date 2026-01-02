const { sequelize } = require('../models');

function mask(val, { tail = 4 } = {}) {
  if (!val) return '';
  const s = String(val);
  if (s.length <= tail) return '*'.repeat(s.length);
  return '*'.repeat(Math.max(0, s.length - tail)) + s.slice(-tail);
}

function getDbInfo() {
  try {
    const dial = sequelize.getDialect();
    const info = { dialect: dial };
    if (dial === 'sqlite') {
      info.storage = (sequelize.options && sequelize.options.storage) || null;
    } else if (process.env.DATABASE_URL) {
      try {
        const u = new URL(process.env.DATABASE_URL);
        info.host = u.hostname;
        info.database = String(u.pathname || '').replace(/^\//,'');
      } catch {}
    }
    return info;
  } catch {
    return {};
  }
}

function main() {
  const env = process.env;
  const payload = {
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: env.PORT || 5000,
    FRONTEND_URL: env.FRONTEND_URL || '',
    CORS_ORIGIN: env.CORS_ORIGIN || '',
    DATABASE_URL_present: !!env.DATABASE_URL,
    PG_SSL: env.PG_SSL || 'false',
    SESSION_SECRET_present: !!env.SESSION_SECRET,
    JWT_REFRESH_SECRET_present: !!env.JWT_REFRESH_SECRET,
    REDIS_URL_present: !!env.REDIS_URL,
    SUPER_ADMIN_IP_WHITELIST: env.SUPER_ADMIN_IP_WHITELIST || '',
    SAML: {
      ENTRY_POINT_present: !!env.SAML_ENTRY_POINT,
      ISSUER: env.SAML_ISSUER || 'school-crm',
      CERT_present: !!env.SAML_CERT,
      PRIVATE_KEY_present: !!env.SAML_PRIVATE_KEY,
      LOGOUT_URL_present: !!env.SAML_LOGOUT_URL
    },
    HCAPTCHA_ENABLED: env.HCAPTCHA_ENABLED || 'false',
    INVITE_TOKEN_EXPIRY_HOURS: env.INVITE_TOKEN_EXPIRY_HOURS || '72',
    LICENSE_KEY_present: !!env.LICENSE_KEY,
    db: getDbInfo()
  };
  console.log(JSON.stringify(payload, null, 2));
}

main();
