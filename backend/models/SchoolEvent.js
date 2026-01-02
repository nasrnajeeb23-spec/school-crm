const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolEvent = sequelize.define('SchoolEvent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  eventType: {
    type: DataTypes.ENUM('Meeting', 'Activity', 'Exam', 'Holiday'),
    allowNull: false,
  },
  // schoolId FK is added via association
});

module.exports = SchoolEvent;
