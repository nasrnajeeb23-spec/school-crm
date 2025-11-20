const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  pricePeriod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  features: {
    type: DataTypes.JSON, // Store features as a JSON array of strings
    allowNull: false,
  },
  limits: {
    type: DataTypes.JSON, // Store limits as a JSON object
    allowNull: false,
  },
  recommended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Plan;