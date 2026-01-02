const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ParentStudent = sequelize.define('ParentStudent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  parentId: { type: DataTypes.INTEGER, allowNull: false },
  studentId: { type: DataTypes.STRING, allowNull: false },
  relationship: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
}, {
  tableName: 'ParentStudents',
  indexes: [
    { fields: ['schoolId', 'parentId'] },
    { fields: ['schoolId', 'studentId'] },
    { unique: true, fields: ['parentId', 'studentId'] },
  ]
});

module.exports = ParentStudent;

