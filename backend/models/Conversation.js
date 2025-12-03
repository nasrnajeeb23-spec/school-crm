const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.STRING, primaryKey: true },
  roomId: { type: DataTypes.STRING, allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  schoolId: { type: DataTypes.INTEGER, allowNull: false },
  teacherId: { type: DataTypes.INTEGER, allowNull: true },
  parentId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['teacherId'] },
    { fields: ['parentId'] },
    { unique: true, fields: ['roomId'] }
  ]
});

module.exports = Conversation;
