const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true, // e.g., 'Credit Card', 'PayPal'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Foreign key for Invoice
});

module.exports = Payment;