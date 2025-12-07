const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SubscriptionModule = sequelize.define('SubscriptionModule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  subscriptionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Subscriptions',
      key: 'id'
    }
  },
  moduleId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'module_catalog',
      key: 'id'
    }
  },
  priceSnapshot: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  activationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SubscriptionModules'
});

module.exports = SubscriptionModule;
