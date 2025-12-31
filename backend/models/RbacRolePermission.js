const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RbacRolePermission = sequelize.define('RbacRolePermission', {
  id: { type: DataTypes.STRING, primaryKey: true },
  roleId: { type: DataTypes.STRING, allowNull: false },
  permissionId: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'RbacRolePermissions',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['roleId', 'permissionId'] },
    { fields: ['permissionId'] },
  ],
});

module.exports = RbacRolePermission;

