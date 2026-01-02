module.exports.up = async ({ sequelize, queryInterface, models }) => {
  const tUsers = models.User.getTableName();
  const tConv = models.Conversation.getTableName();
  const tMsg = models.Message.getTableName();
  await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_schoolId ON "${tUsers}"("schoolId")`);
  await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON "${tUsers}"("role")`);
  await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_conversations_schoolId ON "${tConv}"("schoolId")`);
  await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON "${tMsg}"("conversationId")`);
};
