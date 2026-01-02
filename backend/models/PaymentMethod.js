const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaymentMethod = sequelize.define('PaymentMethod', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('BANK_TRANSFER', 'ONLINE', 'OTHER'),
        allowNull: false,
        defaultValue: 'BANK_TRANSFER'
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Bank Name or Provider Name (e.g. Al Rajhi, Stripe)'
    },
    accountName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Beneficiary Name'
    },
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    iban: {
        type: DataTypes.STRING,
        allowNull: true
    },
    swift: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Payment instructions'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    logoUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'PaymentMethods',
    timestamps: true
});

module.exports = PaymentMethod;
