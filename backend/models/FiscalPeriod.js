const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FiscalPeriod = sequelize.define('FiscalPeriod', {
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
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Period name (e.g., "السنة المالية 2024")'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Period start date'
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Period end date'
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
        comment: 'Period status'
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the period was closed'
    },
    closedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        },
        comment: 'User who closed the period'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Period description'
    }
}, {
    tableName: 'fiscal_periods',
    indexes: [
        { fields: ['schoolId'] },
        { fields: ['status'] },
        { fields: ['startDate', 'endDate'] }
    ],
    validate: {
        endAfterStart() {
            if (this.endDate <= this.startDate) {
                throw new Error('End date must be after start date');
            }
        }
    }
});

module.exports = FiscalPeriod;
