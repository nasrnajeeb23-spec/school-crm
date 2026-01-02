const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BusOperator = sequelize.define('BusOperator', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: false },
  licenseNumber: { type: DataTypes.STRING, allowNull: false },
  busPlateNumber: { type: DataTypes.STRING, allowNull: false },
  busCapacity: { type: DataTypes.INTEGER, allowNull: false },
  busModel: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: true },
  branchId: { type: DataTypes.STRING, allowNull: true },
  stageId: { type: DataTypes.STRING, allowNull: true },
  departmentId: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), allowNull: false, defaultValue: 'Pending' },
});

module.exports = BusOperator;
