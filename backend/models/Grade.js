const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  homework: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quiz: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  midterm: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  final: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Foreign keys are added via association
  // studentId, teacherId, classId
}, {
  indexes: [
    { fields: ['studentId'] },
    { fields: ['classId'] },
    { fields: ['subject'] }
  ]
});

module.exports = Grade;
