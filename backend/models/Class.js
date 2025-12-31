const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gradeLevel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  homeroomTeacherName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  studentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  subjects: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  subjectTeacherMap: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  section: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'أ',
  },
  branchId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stageId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  departmentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Foreign keys schoolId, homeroomTeacherId are added via association
});

module.exports = Class;
