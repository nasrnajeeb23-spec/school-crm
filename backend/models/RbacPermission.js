const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RbacPermission = sequelize.define('RbacPermission', {
  id: { type: DataTypes.STRING, primaryKey: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'RbacPermissions',
  timestamps: true,
  indexes: [{ unique: true, fields: ['key'] }],
});

module.exports = RbacPermission;

