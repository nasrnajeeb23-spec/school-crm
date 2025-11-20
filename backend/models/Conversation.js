const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.STRING, primaryKey: true },
  roomId: { type: DataTypes.STRING, allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  teacherId: { type: DataTypes.STRING, allowNull: true },
  parentId: { type: DataTypes.STRING, allowNull: true },
});

module.exports = Conversation;