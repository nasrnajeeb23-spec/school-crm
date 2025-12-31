const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RbacUserRoleScope = sequelize.define('RbacUserRoleScope', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  roleId: { type: DataTypes.STRING, allowNull: false },
  scopeId: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'RbacUserRoleScopes',
  timestamps: true,
  indexes: [
    { fields: ['schoolId', 'userId'] },
    { unique: true, fields: ['userId', 'roleId', 'scopeId'] },
  ],
});

module.exports = RbacUserRoleScope;

