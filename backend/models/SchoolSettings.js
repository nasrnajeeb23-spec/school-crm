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
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notifications: {
    type: DataTypes.JSON, // { email: bool, sms: bool, push: bool }
    allowNull: false,
  },
  emailConfig: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  smsConfig: {
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
  customLimits: {
    type: DataTypes.JSON, // { students: 1000, teachers: 50, storage: 10 }
    allowNull: true,
  },
  backupSchedule: {
    type: DataTypes.JSON, // { daily: bool, monthly: bool, time: "00:00" }
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
  backupLock: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  scheduleConfig: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  classTemplates: {
    type: DataTypes.JSON, // { defaultSections?: string[], byStage?: [{ stage, grades?: string[], sections?: string[] }] }
    allowNull: true,
  },
  defaultCurrency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'SAR',
  },
  allowedCurrencies: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  operationalStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'ACTIVE',
  },
  // schoolId FK is added via association
});

module.exports = SchoolSettings;
