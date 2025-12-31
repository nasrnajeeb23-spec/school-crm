const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TeacherClassSubjectAssignment = sequelize.define('TeacherClassSubjectAssignment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  teacherId: { type: DataTypes.INTEGER, allowNull: false },
  classId: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
}, {
  tableName: 'TeacherClassSubjectAssignments',
  indexes: [
    { fields: ['schoolId', 'teacherId'] },
    { fields: ['schoolId', 'classId'] },
    { unique: true, fields: ['teacherId', 'classId', 'subject'] },
  ]
});

module.exports = TeacherClassSubjectAssignment;

