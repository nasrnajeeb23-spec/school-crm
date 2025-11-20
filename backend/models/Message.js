const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define('Message', {
  id: { type: DataTypes.STRING, primaryKey: true },
  text: { type: DataTypes.TEXT, allowNull: false },
  senderId: { type: DataTypes.STRING, allowNull: false },
  senderRole: { type: DataTypes.ENUM('PARENT','TEACHER','SCHOOL_ADMIN','SUPER_ADMIN'), allowNull: false },
  attachmentUrl: { type: DataTypes.STRING, allowNull: true },
  attachmentType: { type: DataTypes.STRING, allowNull: true },
  attachmentName: { type: DataTypes.STRING, allowNull: true },
});

module.exports = Message;