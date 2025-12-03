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
}, {
  indexes: [
    { name: 'idx_payment_date', fields: ['paymentDate'] },
    { name: 'idx_invoice_id', fields: ['invoiceId'] }
  ]
});

module.exports = Payment;
