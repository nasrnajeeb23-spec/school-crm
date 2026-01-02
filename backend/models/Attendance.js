const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Late', 'Excused'),
    allowNull: false,
  },
  schoolId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
}, {
  indexes: [
    { fields: ['date'] },
    { fields: ['studentId','date'] },
    { fields: ['classId','date'] },
    { fields: ['schoolId'] },
    { fields: ['schoolId', 'date'] }
  ]
});

module.exports = Attendance;
