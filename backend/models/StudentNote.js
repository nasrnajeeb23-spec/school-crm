const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentNote = sequelize.define('StudentNote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  // Foreign key studentId is added via association
});

module.exports = StudentNote;
