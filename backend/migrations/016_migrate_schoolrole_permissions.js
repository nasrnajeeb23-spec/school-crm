const { Op } = require('sequelize');

module.exports = {
  up: async ({ sequelize, models }) => {
    const { User } = models;
    const { deriveDesiredDbRole, derivePermissionsForUser } = require('../utils/permissionMatrix');

    const transaction = await sequelize.transaction();
    try {
      const batchSize = 200;
      let lastId = 0;

      while (true) {
        const users = await User.findAll({
          where: {
            [Op.and]: [
              { id: { [Op.gt]: lastId } },
              {
                [Op.or]: [
                  { role: { [Op.in]: ['SchoolAdmin', 'Staff'] } },
                  { schoolRole: { [Op.not]: null } }
                ]
              }
            ]
          },
          order: [['id', 'ASC']],
          limit: batchSize,
          transaction
        });

        if (!users.length) break;

        for (const user of users) {
          lastId = user.id;

          const desiredRole = deriveDesiredDbRole({ role: user.role, schoolRole: user.schoolRole });
          const desiredPermissions = derivePermissionsForUser({ role: desiredRole, schoolRole: user.schoolRole });

          const currentPermissions = Array.isArray(user.permissions) ? user.permissions : [];
          const a = [...currentPermissions].slice().sort();
          const b = [...desiredPermissions].slice().sort();
          const samePermissions = JSON.stringify(a) === JSON.stringify(b);

          const updates = {};
          if (!samePermissions) updates.permissions = desiredPermissions;
          if (user.role !== desiredRole && desiredRole !== 'Driver') updates.role = desiredRole;
          if (Object.keys(updates).length > 0) {
            await user.update(updates, { transaction });
          }
        }
      }

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
