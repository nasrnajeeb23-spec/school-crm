const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentDocument = sequelize.define('StudentDocument', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploadDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  // Foreign key studentId is added via association
});

module.exports = StudentDocument;
