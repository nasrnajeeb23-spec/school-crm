const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  grade: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  parentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Suspended'),
    allowNull: false,
  },
  registrationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  profileImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  classId: {
    type: DataTypes.STRING,
    allowNull: true,
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
  homeLocation: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // Foreign keys schoolId, parentId are added via association
}, {
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['parentId'] },
    { fields: ['grade'] },
    { fields: ['status'] },
    { fields: ['schoolId', 'status'] },
    { fields: ['classId'] },
    { fields: ['schoolId', 'branchId'] },
    { fields: ['schoolId', 'stageId'] },
    { fields: ['schoolId', 'departmentId'] }
  ]
});

module.exports = Student;
