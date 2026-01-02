const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RbacRole = sequelize.define('RbacRole', {
  id: { type: DataTypes.STRING, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: true },
  key: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'RbacRoles',
  timestamps: true,
  indexes: [{ unique: true, fields: ['key'] }, { fields: ['schoolId'] }],
});

module.exports = RbacRole;

