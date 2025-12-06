const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  // Mapped to handle legacy schema requirement
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true, // We handle this in hook, but DB has NOT NULL
  },
  method: {
    type: DataTypes.STRING, // Cash, Bank Transfer, Credit Card, etc.
    allowNull: false,
    defaultValue: 'Cash',
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recordedBy: {
    type: DataTypes.INTEGER, // User ID of the admin/staff who recorded it
    allowNull: true,
  }
}, {
  tableName: 'payments',
  indexes: [
    { fields: ['invoiceId'] },
    { fields: ['date'] },
    { fields: ['method'] }
  ],
  hooks: {
    beforeValidate: (payment) => {
      // Ensure both date columns are populated to satisfy DB constraints
      if (payment.date && !payment.paymentDate) {
        payment.paymentDate = payment.date;
      }
      if (!payment.date && payment.paymentDate) {
        payment.date = payment.paymentDate;
      }
      // Fallback if neither is set (though defaultValue covers date)
      if (!payment.date && !payment.paymentDate) {
        payment.date = new Date();
        payment.paymentDate = new Date();
      }
    }
  }
});

module.exports = Payment;
