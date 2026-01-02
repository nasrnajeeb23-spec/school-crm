const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JournalEntryLine = sequelize.define('JournalEntryLine', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    journalEntryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'journal_entries',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    accountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'accounts',
            key: 'id'
        },
        comment: 'Account this line affects'
    },
    debit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Debit amount'
    },
    credit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Credit amount'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Line description'
    },
    lineNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Line number within the entry'
    }
}, {
    tableName: 'journal_entry_lines',
    indexes: [
        { fields: ['journalEntryId'] },
        { fields: ['accountId'] },
        { fields: ['journalEntryId', 'lineNumber'], unique: true }
    ],
    validate: {
        debitOrCredit() {
            // Ensure either debit or credit is non-zero, but not both
            const debitVal = parseFloat(this.debit) || 0;
            const creditVal = parseFloat(this.credit) || 0;

            if (debitVal > 0 && creditVal > 0) {
                throw new Error('A line cannot have both debit and credit amounts');
            }
            if (debitVal === 0 && creditVal === 0) {
                throw new Error('A line must have either a debit or credit amount');
            }
        }
    }
});

module.exports = JournalEntryLine;
