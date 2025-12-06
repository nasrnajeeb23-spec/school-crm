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
  total: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Foreign keys are added via association
  // studentId, teacherId, classId
}, {
  indexes: [
    { fields: ['studentId'] },
    { fields: ['classId'] },
    { fields: ['subject'] }
  ],
  hooks: {
    beforeSave: (grade) => {
      grade.total = (grade.homework || 0) + (grade.quiz || 0) + (grade.midterm || 0) + (grade.final || 0);
    }
  }
});

module.exports = Grade;
