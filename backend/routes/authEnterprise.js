const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const samlAuth = require('../middleware/samlAuth');
const MFAService = require('../services/MFAService');
const OAuthService = require('../services/OAuthService');
const { verifyToken: auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// SAML Authentication Routes
router.get('/saml/login', samlAuth.isConfigured, samlAuth.login);
router.post('/saml/callback', samlAuth.isConfigured, samlAuth.callback);
router.get('/saml/logout', samlAuth.logout);
router.get('/saml/metadata', samlAuth.metadata);

// Multi-Factor Authentication Routes
router.post('/mfa/setup', auth, [
  body('type').optional().isIn(['totp', 'hotp']).withMessage('Invalid MFA type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type = 'totp' } = req.body;
    const userId = req.user.id;

    const result = await MFAService.generateMFASecret(userId, type);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA_SETUP_FAILED',
      message: error.message
    });
  }
});

router.post('/mfa/verify-setup', auth, [
  body('token').isLength({ min: 6, max: 8 }).withMessage('Invalid token format'),
  body('backupCodes').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, backupCodes } = req.body;
    const userId = req.user.id;

    const result = await MFAService.verifyAndActivateMFA(userId, token, backupCodes);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(400).json({
      success: false,
      error: 'MFA_VERIFICATION_FAILED',
      message: error.message
    });
  }
});

router.post('/mfa/verify', auth, [
  body('token').isLength({ min: 6, max: 8 }).withMessage('Invalid token format'),
  body('rememberDevice').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, rememberDevice = false } = req.body;
    const userId = req.user.id;

    const result = await MFAService.verifyMFAToken(userId, token, rememberDevice);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('MFA token verification error:', error);
    res.status(400).json({
      success: false,
      error: 'MFA_TOKEN_VERIFICATION_FAILED',
      message: error.message
    });
  }
});

router.post('/mfa/disable', auth, [
  body('verificationToken').optional().isLength({ min: 6, max: 8 }).withMessage('Invalid verification token')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { verificationToken } = req.body;
    const userId = req.user.id;

    const result = await MFAService.disableMFA(userId, verificationToken);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(400).json({
      success: false,
      error: 'MFA_DISABLE_FAILED',
      message: error.message
    });
  }
});

router.post('/mfa/backup-codes/regenerate', auth, [
  body('verificationToken').isLength({ min: 6, max: 8 }).withMessage('Invalid verification token')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { verificationToken } = req.body;
    const userId = req.user.id;

    const result = await MFAService.generateNewBackupCodes(userId, verificationToken);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    res.status(400).json({
      success: false,
      error: 'BACKUP_CODES_REGENERATION_FAILED',
      message: error.message
    });
  }
});

router.get('/mfa/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await MFAService.getMFAStatus(userId);
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA_STATUS_FAILED',
      message: error.message
    });
  }
});

// OAuth Routes for Google and Microsoft
router.get('/google/authorize', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const state = crypto.randomBytes(16).toString('hex');
    
    const authUrl = await OAuthService.generateGoogleAuthUrl(state, userId);
    
    res.json({
      success: true,
      data: {
        authUrl,
        state
      }
    });

  } catch (error) {
    console.error('Google authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'GOOGLE_AUTH_FAILED',
      message: error.message
    });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CALLBACK_PARAMS',
        message: 'Missing required parameters'
      });
    }

    const result = await OAuthService.handleGoogleCallback(code, state);
    
    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?oauth=google_success`);

  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?oauth=google_error&message=${encodeURIComponent(error.message)}`);
  }
});

router.get('/microsoft/authorize', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const state = crypto.randomBytes(16).toString('hex');
    
    const authUrl = await OAuthService.generateMicrosoftAuthUrl(state, userId);
    
    res.json({
      success: true,
      data: {
        authUrl,
        state
      }
    });

  } catch (error) {
    console.error('Microsoft authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'MICROSOFT_AUTH_FAILED',
      message: error.message
    });
  }
});

router.get('/microsoft/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CALLBACK_PARAMS',
        message: 'Missing required parameters'
      });
    }

    const result = await OAuthService.handleMicrosoftCallback(code, state);
    
    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?oauth=microsoft_success`);

  } catch (error) {
    console.error('Microsoft callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?oauth=microsoft_error&message=${encodeURIComponent(error.message)}`);
  }
});

router.post('/oauth/disconnect', auth, [
  body('provider').isIn(['google', 'microsoft']).withMessage('Invalid provider')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider } = req.body;
    const userId = req.user.id;

    const result = await OAuthService.disconnectProvider(userId, provider);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('OAuth disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'OAUTH_DISCONNECT_FAILED',
      message: error.message
    });
  }
});

router.get('/oauth/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await OAuthService.getOAuthStatus(userId);
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('OAuth status error:', error);
    res.status(500).json({
      success: false,
      error: 'OAUTH_STATUS_FAILED',
      message: error.message
    });
  }
});

router.post('/oauth/refresh', auth, [
  body('provider').isIn(['google', 'microsoft']).withMessage('Invalid provider')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider } = req.body;
    const userId = req.user.id;

    const result = await OAuthService.refreshTokens(userId, provider);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('OAuth refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'OAUTH_REFRESH_FAILED',
      message: error.message
    });
  }
});

// Enterprise authentication status endpoint
router.get('/enterprise/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.user;
    
    const status = {
      saml: {
        configured: !!(process.env.SAML_ENTRY_POINT && process.env.SAML_CERT),
        authenticated: req.session.enterprise?.authProvider === 'saml'
      },
      mfa: await MFAService.getMFAStatus(userId),
      oauth: await OAuthService.getOAuthStatus(userId),
      enterpriseFeatures: {
        auditLogging: true,
        advancedAnalytics: true,
        multiLanguage: true,
        compliance: ['GDPR', 'FERPA', 'COPPA']
      }
    };
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Enterprise status error:', error);
    res.status(500).json({
      success: false,
      error: 'ENTERPRISE_STATUS_FAILED',
      message: error.message
    });
  }
});

module.exports = router;