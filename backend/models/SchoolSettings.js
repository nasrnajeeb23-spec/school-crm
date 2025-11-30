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
  workingDays: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  lessonStartTime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lateThresholdMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  departureTime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  attendanceMethods: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  terms: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  holidays: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  admissionForm: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  backupConfig: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  // schoolId FK is added via association
});

module.exports = SchoolSettings;
