const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TeacherAttendance = sequelize.define('TeacherAttendance', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  checkIn: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  checkOut: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  hoursWorked: {
    type: DataTypes.DECIMAL(5,2),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING, // Present | Absent | Late
    allowNull: false,
    defaultValue: 'Present',
  },
  overtimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  lateMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['schoolId','date'] },
    { fields: ['teacherId','date'] }
  ]
});

module.exports = TeacherAttendance;
