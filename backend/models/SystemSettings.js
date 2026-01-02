const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemSettings = sequelize.define('SystemSettings', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    value: {
        type: DataTypes.JSON,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'SystemSettings',
    timestamps: true
});

module.exports = SystemSettings;
