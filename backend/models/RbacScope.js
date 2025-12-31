const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RbacScope = sequelize.define('RbacScope', {
  id: { type: DataTypes.STRING, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  key: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  parentScopeId: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'RbacScopes',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['schoolId', 'type', 'key'] },
    { fields: ['schoolId'] },
  ],
});

module.exports = RbacScope;

