const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RouteStudent = sequelize.define('RouteStudent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  // FKs added via associations
});

module.exports = RouteStudent;