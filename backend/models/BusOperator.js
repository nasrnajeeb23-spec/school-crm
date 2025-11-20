const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BusOperator = sequelize.define('BusOperator', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  licenseNumber: { type: DataTypes.STRING, allowNull: false },
  busPlateNumber: { type: DataTypes.STRING, allowNull: false },
  busCapacity: { type: DataTypes.INTEGER, allowNull: false },
  busModel: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), allowNull: false, defaultValue: 'Pending' },
});

module.exports = BusOperator;