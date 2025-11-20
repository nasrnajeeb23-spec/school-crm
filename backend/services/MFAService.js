const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

class MFAService {
  /**
   * Generate MFA secret for user
   */
  async generateMFASecret(userId, type = 'totp') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret based on type
      let secret;
      let backupCodes = [];

      switch (type) {
        case 'totp':
          secret = speakeasy.generateSecret({
            name: `School CRM (${user.email})`,
            issuer: 'School CRM',
            length: 32
          });
          break;

        case 'hotp':
          secret = speakeasy.generateSecret({
            name: `School CRM (${user.email})`,
            issuer: 'School CRM',
            length: 32
          });
          break;

        default:
          throw new Error('Unsupported MFA type');
      }

      // Generate backup codes
      backupCodes = this.generateBackupCodes(8);

      // Store encrypted secret temporarily (not activated yet)
      const tempData = {
        secret: secret.base32,
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        type,
        createdAt: new Date()
      };

      // Store in user's temporary MFA data
      user.tempMFA = tempData;
      await user.save();

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Log MFA setup initiation
      await AuditLog.create({
        userId: user._id,
        action: 'MFA_SETUP_INITIATED',
        resource: 'MFA',
        details: { type, method: 'generate_secret' },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes, // Only shown once
        type,
        setupRequired: true
      };

    } catch (error) {
      console.error('MFA secret generation error:', error);
      
      // Log failure
      try {
        await AuditLog.create({
          userId: userId,
          action: 'MFA_SETUP_FAILED',
          resource: 'MFA',
          details: { error: error.message, type },
          ipAddress: 'system',
          userAgent: 'system'
        });
      } catch (auditError) {
        console.error('Failed to log MFA setup failure:', auditError);
      }
      
      throw error;
    }
  }

  /**
   * Verify MFA token and activate MFA
   */
  async verifyAndActivateMFA(userId, token, backupCodes = []) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.tempMFA) {
        throw new Error('MFA setup not initiated or expired');
      }

      const { secret, type, backupCodes: hashedBackupCodes } = user.tempMFA;

      // Verify the token
      const verified = this.verifyToken(secret, token, type);

      if (!verified) {
        // Log verification failure
        await AuditLog.create({
          userId: user._id,
          action: 'MFA_VERIFICATION_FAILED',
          resource: 'MFA',
          details: { type, reason: 'invalid_token' },
          ipAddress: 'system',
          userAgent: 'system'
        });

        throw new Error('Invalid verification code');
      }

      // Activate MFA
      user.mfa = {
        enabled: true,
        type,
        secret, // Store encrypted in production
        backupCodes: hashedBackupCodes,
        activatedAt: new Date(),
        lastUsed: null
      };

      // Clear temporary data
      user.tempMFA = undefined;
      await user.save();

      // Log successful activation
      await AuditLog.create({
        userId: user._id,
        action: 'MFA_ACTIVATED',
        resource: 'MFA',
        details: { type },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return {
        success: true,
        message: 'MFA activated successfully',
        type
      };

    } catch (error) {
      console.error('MFA activation error:', error);
      throw error;
    }
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFAToken(userId, token, rememberDevice = false) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa?.enabled) {
        throw new Error('MFA not enabled for user');
      }

      const { secret, type, backupCodes } = user.mfa;

      // Check if token is a backup code
      if (token.length === 8 && /^[A-Z0-9]{8}$/.test(token)) {
        const isValidBackupCode = await this.verifyBackupCode(userId, token);
        if (isValidBackupCode) {
          // Update last used
          user.mfa.lastUsed = new Date();
          await user.save();

          // Log successful backup code use
          await AuditLog.create({
            userId: user._id,
            action: 'MFA_BACKUP_CODE_USED',
            resource: 'MFA',
            details: { method: 'backup_code' },
            ipAddress: 'system',
            userAgent: 'system'
          });

          return {
            success: true,
            method: 'backup_code',
            message: 'Backup code accepted'
          };
        }
      }

      // Verify regular token
      const verified = this.verifyToken(secret, token, type);

      if (!verified) {
        // Log verification failure
        await AuditLog.create({
          userId: user._id,
          action: 'MFA_VERIFICATION_FAILED',
          resource: 'MFA',
          details: { type, reason: 'invalid_token' },
          ipAddress: 'system',
          userAgent: 'system'
        });

        throw new Error('Invalid verification code');
      }

      // Update last used
      user.mfa.lastUsed = new Date();
      
      // Handle device remember functionality
      if (rememberDevice) {
        const deviceToken = crypto.randomBytes(32).toString('hex');
        const deviceIdentifier = this.generateDeviceIdentifier();
        
        if (!user.mfa.trustedDevices) {
          user.mfa.trustedDevices = [];
        }
        
        user.mfa.trustedDevices.push({
          token: deviceToken,
          identifier: deviceIdentifier,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }

      await user.save();

      // Log successful verification
      await AuditLog.create({
        userId: user._id,
        action: 'MFA_VERIFICATION_SUCCESS',
        resource: 'MFA',
        details: { type, rememberDevice },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return {
        success: true,
        method: type,
        message: 'MFA verification successful'
      };

    } catch (error) {
      console.error('MFA token verification error:', error);
      throw error;
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId, verificationToken = null) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa?.enabled) {
        throw new Error('MFA not enabled for user');
      }

      // If verification token provided, verify it first
      if (verificationToken) {
        const verified = this.verifyToken(user.mfa.secret, verificationToken, user.mfa.type);
        if (!verified) {
          await AuditLog.create({
            userId: user._id,
            action: 'MFA_DISABLE_FAILED',
            resource: 'MFA',
            details: { reason: 'verification_failed' },
            ipAddress: 'system',
            userAgent: 'system'
          });

          throw new Error('Verification failed');
        }
      }

      // Disable MFA
      user.mfa.enabled = false;
      user.mfa.disabledAt = new Date();
      
      // Keep backup codes and history for audit
      const mfaHistory = {
        type: user.mfa.type,
        enabledAt: user.mfa.activatedAt,
        disabledAt: new Date(),
        backupCodesUsed: user.mfa.backupCodes?.filter(code => code.used)?.length || 0
      };

      if (!user.mfa.history) {
        user.mfa.history = [];
      }
      user.mfa.history.push(mfaHistory);

      // Clear current MFA data
      user.mfa = {
        enabled: false,
        history: user.mfa.history
      };

      await user.save();

      // Log MFA disable
      await AuditLog.create({
        userId: user._id,
        action: 'MFA_DISABLED',
        resource: 'MFA',
        details: { verified: !!verificationToken },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return {
        success: true,
        message: 'MFA disabled successfully'
      };

    } catch (error) {
      console.error('MFA disable error:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId, verificationToken) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa?.enabled) {
        throw new Error('MFA not enabled for user');
      }

      // Verify token first
      const verified = this.verifyToken(user.mfa.secret, verificationToken, user.mfa.type);
      if (!verified) {
        await AuditLog.create({
          userId: user._id,
          action: 'BACKUP_CODES_GENERATION_FAILED',
          resource: 'MFA',
          details: { reason: 'verification_failed' },
          ipAddress: 'system',
          userAgent: 'system'
        });

        throw new Error('Verification failed');
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodes(8);
      const hashedBackupCodes = newBackupCodes.map(code => this.hashBackupCode(code));

      // Update user's backup codes
      user.mfa.backupCodes = hashedBackupCodes;
      await user.save();

      // Log backup code generation
      await AuditLog.create({
        userId: user._id,
        action: 'BACKUP_CODES_GENERATED',
        resource: 'MFA',
        details: { count: newBackupCodes.length },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return {
        success: true,
        backupCodes: newBackupCodes,
        message: 'New backup codes generated'
      };

    } catch (error) {
      console.error('Backup codes generation error:', error);
      throw error;
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId, deviceToken) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa?.trustedDevices) {
        return false;
      }

      const device = user.mfa.trustedDevices.find(d => 
        d.token === deviceToken && 
        d.expiresAt > new Date() &&
        d.identifier === this.generateDeviceIdentifier()
      );

      return !!device;

    } catch (error) {
      console.error('Device trust check error:', error);
      return false;
    }
  }

  /**
   * Helper: Generate backup codes
   */
  generateBackupCodes(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Helper: Hash backup code
   */
  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Helper: Verify backup code
   */
  async verifyBackupCode(userId, code) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa?.backupCodes) {
        return false;
      }

      const hashedCode = this.hashBackupCode(code);
      const backupCodeIndex = user.mfa.backupCodes.findIndex(storedHash => 
        storedHash === hashedCode && !storedHash.used
      );

      if (backupCodeIndex === -1) {
        return false;
      }

      // Mark backup code as used
      user.mfa.backupCodes[backupCodeIndex] = {
        hash: hashedCode,
        used: true,
        usedAt: new Date()
      };

      await user.save();
      return true;

    } catch (error) {
      console.error('Backup code verification error:', error);
      return false;
    }
  }

  /**
   * Helper: Verify token
   */
  verifyToken(secret, token, type = 'totp') {
    try {
      const options = {
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps of drift
      };

      if (type === 'hotp') {
        options.counter = 0; // This should be managed properly in production
      }

      return speakeasy.totp.verify(options) || speakeasy.hotp.verify(options);

    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Helper: Generate device identifier
   */
  generateDeviceIdentifier() {
    // This should be implemented to generate a consistent identifier
    // for the current device/browser combination
    return crypto.createHash('sha256').update('device-fingerprint').digest('hex');
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const status = {
        enabled: user.mfa?.enabled || false,
        type: user.mfa?.type || null,
        activatedAt: user.mfa?.activatedAt || null,
        lastUsed: user.mfa?.lastUsed || null,
        trustedDevices: user.mfa?.trustedDevices?.length || 0,
        backupCodesRemaining: user.mfa?.backupCodes?.filter(code => !code.used)?.length || 0
      };

      return status;

    } catch (error) {
      console.error('MFA status check error:', error);
      throw error;
    }
  }
}

module.exports = new MFAService();