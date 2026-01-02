const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DriverRoute = sequelize.define('DriverRoute', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  driverUserId: { type: DataTypes.INTEGER, allowNull: false },
  routeId: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
}, {
  tableName: 'DriverRoutes',
  indexes: [
    { fields: ['schoolId', 'driverUserId'] },
    { fields: ['schoolId', 'routeId'] },
    { unique: true, fields: ['driverUserId', 'routeId'] },
  ]
});

module.exports = DriverRoute;

