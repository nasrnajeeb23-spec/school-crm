const { DataTypes } = require('sequelize');

async function safeDescribe(queryInterface, tableName, transaction) {
  return queryInterface.describeTable(tableName, { transaction }).catch(() => null);
}

async function safeAddColumn(queryInterface, tableName, columnName, definition, transaction) {
  await queryInterface.addColumn(tableName, columnName, definition, { transaction }).catch(() => {});
}

async function safeAddIndex(queryInterface, tableName, fields, options, transaction) {
  await queryInterface.addIndex(tableName, fields, { ...(options || {}), transaction }).catch(() => {});
}

async function safeRemoveIndex(queryInterface, tableName, indexName, transaction) {
  await queryInterface.removeIndex(tableName, indexName, { transaction }).catch(() => {});
}

async function safeRemoveColumn(queryInterface, tableName, columnName, transaction) {
  await queryInterface.removeColumn(tableName, columnName, { transaction }).catch(() => {});
}

async function ensureScopeColumns(queryInterface, sequelize, tableNames) {
  const transaction = await sequelize.transaction();
  try {
    let target = null;
    let desc = null;
    for (const t of tableNames) {
      const d = await safeDescribe(queryInterface, t, transaction);
      if (d) {
        target = t;
        desc = d;
        break;
      }
    }

    if (!target || !desc) {
      await transaction.commit();
      return;
    }

    if (!desc.branchId) await safeAddColumn(queryInterface, target, 'branchId', { type: DataTypes.STRING, allowNull: true }, transaction);
    if (!desc.stageId) await safeAddColumn(queryInterface, target, 'stageId', { type: DataTypes.STRING, allowNull: true }, transaction);
    if (!desc.departmentId) await safeAddColumn(queryInterface, target, 'departmentId', { type: DataTypes.STRING, allowNull: true }, transaction);

    await safeAddIndex(queryInterface, target, ['schoolId', 'branchId'], { name: `${target}_school_branch_idx` }, transaction);
    await safeAddIndex(queryInterface, target, ['schoolId', 'stageId'], { name: `${target}_school_stage_idx` }, transaction);
    await safeAddIndex(queryInterface, target, ['schoolId', 'departmentId'], { name: `${target}_school_dept_idx` }, transaction);

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

async function removeScopeColumns(queryInterface, sequelize, tableNames) {
  const transaction = await sequelize.transaction();
  try {
    let target = null;
    let desc = null;
    for (const t of tableNames) {
      const d = await safeDescribe(queryInterface, t, transaction);
      if (d) {
        target = t;
        desc = d;
        break;
      }
    }

    if (!target || !desc) {
      await transaction.commit();
      return;
    }

    await safeRemoveIndex(queryInterface, target, `${target}_school_branch_idx`, transaction);
    await safeRemoveIndex(queryInterface, target, `${target}_school_stage_idx`, transaction);
    await safeRemoveIndex(queryInterface, target, `${target}_school_dept_idx`, transaction);

    if (desc.departmentId) await safeRemoveColumn(queryInterface, target, 'departmentId', transaction);
    if (desc.stageId) await safeRemoveColumn(queryInterface, target, 'stageId', transaction);
    if (desc.branchId) await safeRemoveColumn(queryInterface, target, 'branchId', transaction);

    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

module.exports = {
  up: async ({ queryInterface, sequelize }) => {
    await ensureScopeColumns(queryInterface, sequelize, ['Students', 'students']);
    await ensureScopeColumns(queryInterface, sequelize, ['Teachers', 'teachers']);
    await ensureScopeColumns(queryInterface, sequelize, ['Classes', 'classes']);
    await ensureScopeColumns(queryInterface, sequelize, ['BusOperators', 'busoperators']);
    await ensureScopeColumns(queryInterface, sequelize, ['Routes', 'routes']);
  },
  down: async ({ queryInterface, sequelize }) => {
    await removeScopeColumns(queryInterface, sequelize, ['Students', 'students']);
    await removeScopeColumns(queryInterface, sequelize, ['Teachers', 'teachers']);
    await removeScopeColumns(queryInterface, sequelize, ['Classes', 'classes']);
    await removeScopeColumns(queryInterface, sequelize, ['BusOperators', 'busoperators']);
    await removeScopeColumns(queryInterface, sequelize, ['Routes', 'routes']);
  },
};
