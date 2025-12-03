const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  day: {
    type: DataTypes.ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'),
    allowNull: false,
  },
  timeSlot: {
    type: DataTypes.STRING, // e.g., "08:00 - 09:00"
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Foreign keys are added via association
  // classId, teacherId
}, {
  indexes: [
    { fields: ['classId'] },
    { fields: ['teacherId'] },
    { fields: ['day'] },
    { fields: ['classId','day'] }
  ]
});

module.exports = Schedule;
