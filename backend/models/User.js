const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bankAccount: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salaryStructureId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobilePushToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  appPlatform: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  appVersion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
<<<<<<< HEAD
    type: DataTypes.ENUM('SuperAdmin', 'SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor', 'SchoolAdmin', 'Teacher', 'Parent', 'Staff', 'Accountant'),
=======
    type: DataTypes.ENUM('SuperAdmin', 'SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor', 'SchoolAdmin', 'Teacher', 'Parent', 'Staff', 'Driver'),
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
    allowNull: false,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  preferredLanguage: {
    type: DataTypes.STRING(5),
    defaultValue: 'ar',
  },
  timezone: {
    type: DataTypes.STRING,
    defaultValue: 'Asia/Riyadh',
  },
  schoolRole: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  mfaSecret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backupCodes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  samlId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  oauthProvider: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  oauthId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  auditEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  permissions: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('permissions');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('permissions', JSON.stringify(value));
    }
  },
  passwordMustChange: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastPasswordChangeAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  tokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastInviteAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastInviteChannel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['schoolId']
    },
    {
      fields: ['role']
    },
    {
      fields: ['teacherId']
    },
    {
      fields: ['parentId']
    }
  ]
});

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_must_be_32_bytes_len'; // Fallback for dev
const IV_LENGTH = 16;
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function encrypt(text) {
  if (!text) return null;
  // Ensure key is 32 bytes
  const keyMap = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyMap, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const keyMap = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyMap, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    // Return original if decryption fails (backward compatibility)
    return text;
  }
}

// Hooks
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  if (user.mfaSecret) {
    user.mfaSecret = encrypt(user.mfaSecret);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  if (user.changed('mfaSecret')) {
    user.mfaSecret = encrypt(user.mfaSecret);
  }
});

// Instance method to check password
User.prototype.validPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Instance method to get clear MFA secret
User.prototype.getMfaSecret = function () {
  return decrypt(this.mfaSecret);
};

module.exports = User;
