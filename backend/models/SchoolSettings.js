const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolSettings = sequelize.define('SchoolSettings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  schoolName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  schoolAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  schoolLogoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  geoLocation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  genderType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  levelType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ownershipType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  availableStages: {
    type: DataTypes.JSON, // ["رياض أطفال","ابتدائي","إعدادي","ثانوي"]
    allowNull: true,
  },
  workingHoursStart: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  workingHoursEnd: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  academicYearStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  academicYearEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  notifications: {
    type: DataTypes.JSON, // { email: bool, sms: bool, push: bool }
    allowNull: false,
  },
  activeModules: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // schoolId FK is added via association
});

module.exports = SchoolSettings;
