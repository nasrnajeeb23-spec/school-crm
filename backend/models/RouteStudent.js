const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RouteStudent = sequelize.define('RouteStudent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  routeId: { type: DataTypes.STRING, allowNull: false },
  studentId: { type: DataTypes.STRING, allowNull: false },
});

module.exports = RouteStudent;
