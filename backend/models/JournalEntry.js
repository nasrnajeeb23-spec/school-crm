const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JournalEntry = sequelize.define('JournalEntry', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    schoolId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Schools',
            key: 'id'
        }
    },
    entryNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Sequential entry number (e.g., JE-2024-001)'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Entry date'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Entry description'
    },
    reference: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'External reference (invoice number, receipt number, etc.)'
    },
    referenceType: {
        type: DataTypes.ENUM('INVOICE', 'PAYMENT', 'EXPENSE', 'SALARY', 'REFUND', 'DISCOUNT', 'MANUAL'),
        allowNull: false,
        defaultValue: 'MANUAL',
        comment: 'Type of reference'
    },
    referenceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of the referenced entity'
    },
    fiscalPeriodId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'fiscal_periods',
            key: 'id'
        },
        comment: 'Fiscal period this entry belongs to'
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'POSTED', 'REVERSED'),
        allowNull: false,
        defaultValue: 'DRAFT',
        comment: 'Entry status'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'User who created the entry'
    },
    postedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the entry was posted'
    },
    postedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'User who posted the entry'
    },
    reversedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of the reversing journal entry'
    },
    reversedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the entry was reversed'
    },
    totalDebit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total debit amount (for validation)'
    },
    totalCredit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Total credit amount (for validation)'
    }
}, {
    tableName: 'journal_entries',
    indexes: [
        { fields: ['schoolId'] },
        { fields: ['schoolId', 'entryNumber'], unique: true },
        { fields: ['date'] },
        { fields: ['status'] },
        { fields: ['fiscalPeriodId'] },
        { fields: ['referenceType', 'referenceId'] },
        { fields: ['createdBy'] }
    ]
});

module.exports = JournalEntry;
