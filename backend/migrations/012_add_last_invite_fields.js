module.exports.up = async ({ queryInterface, sequelize }) => {
  const DataTypes = require('sequelize').DataTypes;
  try {
    const desc = await queryInterface.describeTable('users');
    if (!desc.lastInviteAt) {
      await queryInterface.addColumn('users', 'lastInviteAt', { type: DataTypes.DATE, allowNull: true });
    }
    if (!desc.lastInviteChannel) {
      await queryInterface.addColumn('users', 'lastInviteChannel', { type: DataTypes.STRING, allowNull: true });
    }
  } catch (e) {
    console.error('Migration 012_add_last_invite_fields failed:', e && e.message ? e.message : e);
    throw e;
  }
};
