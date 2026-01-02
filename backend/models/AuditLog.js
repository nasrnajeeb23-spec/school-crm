const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User who performed the action'
  },
  action: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Action type: CREATE, UPDATE, DELETE, LOGIN, LOGOUT'
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Type of entity: Role, Permission, User, Student, Teacher, etc.'
  },
  entityId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID of the affected entity'
  },
  oldValue: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Previous value before change (for UPDATE/DELETE)'
  },
  newValue: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'New value after change (for CREATE/UPDATE)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the user'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser/client information'
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'School context for the action'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context or metadata'
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
    comment: 'Risk level of the action'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
}, {
  tableName: 'AuditLogs',
  timestamps: false,
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['entityType'] },
    { fields: ['entityId'] },
    { fields: ['schoolId'] },
    { fields: ['createdAt'] },
    { fields: ['riskLevel'] },
    { fields: ['userId', 'action'] },
    { fields: ['schoolId', 'entityType'] },
  ],
});

module.exports = AuditLog;