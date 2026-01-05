const passport = require('passport');
const SamlStrategy = require('@node-saml/passport-saml').Strategy;
const { User, AuditLog } = require('../models');
const crypto = require('crypto');

// SAML configuration
const samlConfig = {
  path: '/api/auth/saml/callback',
  entryPoint: process.env.SAML_ENTRY_POINT,
  issuer: process.env.SAML_ISSUER || 'school-crm',
  cert: process.env.SAML_CERT,
  privateKey: process.env.SAML_PRIVATE_KEY,
  decryptionPvk: process.env.SAML_PRIVATE_KEY,
  signatureAlgorithm: 'sha256',
  acceptedClockSkewMs: 2000,
  disableRequestedAuthnContext: false,
  authnRequestBinding: 'HTTP-Redirect',
  logoutUrl: process.env.SAML_LOGOUT_URL,
  logoutCallbackUrl: '/api/auth/saml/logout/callback',
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  wantAuthnResponseSigned: true,
  wantAssertionsSigned: true,
  validateInResponseTo: true,
  requestIdExpirationPeriodMs: 300000,
  audience: process.env.SAML_AUDIENCE || (process.env.SAML_ISSUER || 'school-crm')
};

// Initialize SAML strategy
if (samlConfig.entryPoint && samlConfig.cert) {
  passport.use(new SamlStrategy(
    samlConfig,
    async (profile, done) => {
      try {
        const email = profile.email || profile.nameID;
        const firstName = profile.firstName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
        const lastName = profile.lastName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
        const roleRaw = profile.role || profile['http://schemas.xmlsoap.org/claims/Group'] || 'Teacher';
        const role = String(roleRaw).toLowerCase().includes('admin') ? 'SchoolAdmin' : 'Teacher';
        const schoolId = Number(profile.schoolId || profile['http://schemas.school-crm.com/claims/schoolid'] || 1);

        let user = await User.findOne({ where: { email } });
        if (!user) {
          const name = [firstName, lastName].filter(Boolean).join(' ') || email;
          user = await User.create({
            email,
            username: email.split('@')[0],
            name,
            role,
            schoolId,
            preferredLanguage: 'en',
            timezone: 'UTC',
            password: crypto.randomBytes(16).toString('hex')
          });
          await AuditLog.create({
            userId: user.id,
            action: 'USER_CREATED',
            resource: 'User',
            details: { method: 'SAML', provider: samlConfig.issuer },
            ipAddress: 'unknown',
            userAgent: 'unknown'
          });
        } else {
          user.lastLogin = new Date();
          await user.save();
        }

        await AuditLog.create({
          userId: user.id,
          action: 'AUTH_SUCCESS',
          resource: 'Authentication',
          details: { method: 'SAML', provider: samlConfig.issuer },
          ipAddress: 'unknown',
          userAgent: 'unknown'
        });

        return done(null, user);
      } catch (error) {
        console.error('SAML authentication error:', error);
        try {
          await AuditLog.create({
            action: 'AUTH_FAILURE',
            resource: 'Authentication',
            details: { method: 'SAML', error: error.message, provider: samlConfig.issuer },
            ipAddress: 'unknown',
            userAgent: 'unknown'
          });
        } catch (auditError) {
          console.error('Failed to log SAML auth failure:', auditError);
        }
        return done(error);
      }
    }
  ));
}

// SAML authentication middleware
const samlAuth = {
  // Initialize passport SAML
  initialize: () => {
    return passport.initialize();
  },

  // SAML session management
  session: () => {
    return passport.session();
  },

  // SAML login endpoint
  login: (req, res, next) => {
    // Generate unique request ID for tracking
    const requestId = crypto.randomUUID();
    req.session.samlRequestId = requestId;

    // Store additional context
    req.session.samlLoginContext = {
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    passport.authenticate('saml', {
      successRedirect: '/dashboard',
      failureRedirect: '/login?error=saml',
      failureFlash: true
    })(req, res, next);
  },

  // SAML callback endpoint
  callback: (req, res, next) => {
    passport.authenticate('saml', {
      failureRedirect: '/login?error=saml',
      failureFlash: true
    }, async (err, user, info) => {
      if (err) {
        console.error('SAML callback error:', err);
        return res.redirect('/login?error=saml_auth_failed');
      }

      if (!user) {
        return res.redirect('/login?error=saml_user_not_found');
      }

      // Create session
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error('Session creation error:', loginErr);
          return res.redirect('/login?error=session_failed');
        }

        // Update session with enterprise data
        req.session.enterprise = {
          authProvider: 'saml',
          samlSessionIndex: info?.sessionIndex || null,
          loginTime: new Date()
        };

        // Log successful login
        try {
          await AuditLog.create({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            resource: 'Authentication',
            details: {
              method: 'SAML',
              provider: samlConfig.issuer,
              sessionId: req.sessionID
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditError) {
          console.error('Failed to log SAML login:', auditError);
        }

        res.redirect('/dashboard');
      });
    })(req, res, next);
  },

  // SAML logout endpoint
  logout: (req, res) => {
    if (req.user && req.session.enterprise?.samlSessionIndex) {
      // Store logout data for audit
      const logoutData = {
        userId: req.user.id,
        sessionIndex: req.session.enterprise.samlSessionIndex,
        logoutTime: new Date()
      };

      // Log logout attempt
      AuditLog.create({
        userId: req.user.id,
        action: 'LOGOUT_ATTEMPT',
        resource: 'Authentication',
        details: { method: 'SAML', provider: samlConfig.issuer },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).catch(err => console.error('Failed to log SAML logout:', err));

      // Destroy session first
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }

        // Redirect to SAML logout if configured
        if (samlConfig.logoutUrl) {
          const logoutUrl = `${samlConfig.logoutUrl}?ReturnTo=${encodeURIComponent(process.env.FRONTEND_URL || 'http://localhost:3000')}`;
          res.redirect(logoutUrl);
        } else {
          res.redirect('/login?message=logged_out');
        }
      });
    } else {
      // Regular logout
      req.session.destroy(() => {
        res.redirect('/login?message=logged_out');
      });
    }
  },

  // SAML metadata endpoint
  metadata: (req, res) => {
    const strategy = passport._strategies.saml;
    if (strategy && strategy.generateServiceProviderMetadata) {
      const metadata = strategy.generateServiceProviderMetadata(
        process.env.SAML_DECRYPTION_CERT,
        process.env.SAML_SIGNING_CERT
      );

      res.set('Content-Type', 'application/xml');
      res.send(metadata);
    } else {
      res.status(500).json({
        error: 'SAML metadata not available',
        message: 'SAML strategy not properly configured'
      });
    }
  },

  // Middleware to check if SAML is configured
  isConfigured: (req, res, next) => {
    if (!samlConfig.entryPoint || !samlConfig.cert) {
      return res.status(501).json({
        error: 'SAML_NOT_CONFIGURED',
        message: 'SAML authentication is not configured for this instance'
      });
    }
    next();
  },

  // Middleware to require SAML authentication
  requireAuth: (req, res, next) => {
    if (req.isAuthenticated() && req.session.enterprise?.authProvider === 'saml') {
      return next();
    }

    res.status(401).json({
      error: 'SAML_AUTH_REQUIRED',
      message: 'SAML authentication required',
      loginUrl: '/api/auth/saml/login'
    });
  }
};

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    if (user) { user.password = undefined; }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = samlAuth;
