const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Submission = sequelize.define('Submission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    submissionDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Submitted', 'NotSubmitted', 'Late', 'Graded'),
        defaultValue: 'NotSubmitted'
    },
    grade: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    }
}, {
    timestamps: true
});

module.exports = Submission;
