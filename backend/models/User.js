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
    type: DataTypes.ENUM('SuperAdmin', 'SuperAdminFinancial', 'SuperAdminTechnical', 'SuperAdminSupervisor', 'SchoolAdmin', 'Teacher', 'Parent', 'Staff'),
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

module.exports = User;
