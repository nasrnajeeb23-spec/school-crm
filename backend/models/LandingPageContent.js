const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LandingPageContent = sequelize.define('LandingPageContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  section: {
    type: DataTypes.STRING, // 'hero', 'features', 'ads'
    allowNull: false
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = LandingPageContent;
