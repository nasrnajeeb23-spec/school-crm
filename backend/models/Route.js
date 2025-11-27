const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Route = sequelize.define('Route', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: true },
  busOperatorId: { type: DataTypes.STRING, allowNull: true },
  departureTime: { type: DataTypes.STRING, allowNull: true },
  stops: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
});

module.exports = Route;
