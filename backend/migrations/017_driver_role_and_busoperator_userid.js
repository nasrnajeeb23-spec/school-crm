const { DataTypes, Op } = require('sequelize');

module.exports = {
  up: async ({ queryInterface, sequelize, models }) => {
    const { User, BusOperator } = models;
    const transaction = await sequelize.transaction();
    try {
      const busOpDesc =
        (await queryInterface.describeTable('BusOperators').catch(() => null)) ||
        (await queryInterface.describeTable('busoperators').catch(() => null)) ||
        null;

      if (busOpDesc && !busOpDesc.userId) {
        await queryInterface.addColumn('BusOperators', 'userId', { type: DataTypes.INTEGER, allowNull: true }, { transaction }).catch(async () => {
          await queryInterface.addColumn('busoperators', 'userId', { type: DataTypes.INTEGER, allowNull: true }, { transaction });
        });
      }

      const dialect = sequelize.getDialect();
      if (dialect === 'postgres') {
        await sequelize.query(
          `
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_role') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_users_role' AND e.enumlabel = 'Driver'
    ) THEN
      EXECUTE 'ALTER TYPE "enum_users_role" ADD VALUE ''Driver''';
    END IF;
  END IF;
END$$;
          `,
          { transaction }
        ).catch(() => {});
      }

      await User.update(
        { role: 'Driver', permissions: [] },
        { where: { schoolRole: 'سائق' }, transaction }
      ).catch(() => {});

      const ops = await BusOperator.findAll({ where: { status: 'Approved', userId: { [Op.is]: null } }, transaction }).catch(() => []);
      for (const opRow of ops) {
        const email = String(opRow.email || '').trim();
        const phone = String(opRow.phone || '').trim();
        const where = {
          schoolId: opRow.schoolId,
          schoolRole: 'سائق',
          [Op.or]: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ]
        };
        const u = await User.findOne({ where, transaction }).catch(() => null);
        if (u) {
          try {
            opRow.userId = u.id;
            await opRow.save({ transaction });
          } catch {}
        }
      }

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
