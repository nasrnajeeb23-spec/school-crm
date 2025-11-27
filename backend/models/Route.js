const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Route = sequelize.define('Route', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  departureTime: { type: DataTypes.STRING, allowNull: true },
  stops: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
});

module.exports = Route;
