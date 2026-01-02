const { DataTypes } = require('sequelize');

function hasTable(tables, name) {
  const n = String(name || '').toLowerCase();
  return (tables || []).some(x => String(x || '').toLowerCase() === n);
}

async function safeCreateTable(queryInterface, tables, tableName, definition, options) {
  if (hasTable(tables, tableName)) return;
  await queryInterface.createTable(tableName, definition, options || {});
}

async function safeAddIndex(queryInterface, tableName, fields, options) {
  try {
    await queryInterface.addIndex(tableName, fields, options || {});
  } catch {}
}

module.exports = {
  up: async ({ sequelize, queryInterface }) => {
    const dialect = sequelize.getDialect();
    const transaction = await sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction }).catch(() => []);

      // Create AuditLogs table
      await safeCreateTable(queryInterface, tables, 'AuditLogs', {
        id: { 
          type: DataTypes.INTEGER, 
          primaryKey: true, 
          autoIncrement: true 
        },
        userId: { 
          type: DataTypes.INTEGER, 
          allowNull: false,
          comment: 'User who performed the action'
        },
        action: { 
          type: DataTypes.STRING(20), 
          allowNull: false,
          comment: 'Action type: CREATE, UPDATE, DELETE, LOGIN, LOGOUT'
        },
        entityType: { 
          type: DataTypes.STRING(50), 
          allowNull: false,
          comment: 'Type of entity: Role, Permission, User, Student, Teacher, etc.'
        },
        entityId: { 
          type: DataTypes.STRING(255), 
          allowNull: true,
          comment: 'ID of the affected entity'
        },
        oldValue: { 
          type: DataTypes.JSON, 
          allowNull: true,
          comment: 'Previous value before change (for UPDATE/DELETE)'
        },
        newValue: { 
          type: DataTypes.JSON, 
          allowNull: true,
          comment: 'New value after change (for CREATE/UPDATE)'
        },
        ipAddress: { 
          type: DataTypes.STRING(45), 
          allowNull: true,
          comment: 'IP address of the user'
        },
        userAgent: { 
          type: DataTypes.TEXT, 
          allowNull: true,
          comment: 'Browser/client information'
        },
        schoolId: { 
          type: DataTypes.INTEGER, 
          allowNull: true,
          comment: 'School context for the action'
        },
        metadata: { 
          type: DataTypes.JSON, 
          allowNull: true,
          comment: 'Additional context or metadata'
        },
        createdAt: { 
          type: DataTypes.DATE, 
          allowNull: false, 
          defaultValue: DataTypes.NOW 
        },
      }, { transaction });

      // Add indexes for better query performance
      await safeAddIndex(queryInterface, 'AuditLogs', ['userId'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['action'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['entityType'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['entityId'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['schoolId'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['createdAt'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['userId', 'action'], { transaction });
      await safeAddIndex(queryInterface, 'AuditLogs', ['schoolId', 'entityType'], { transaction });

      await transaction.commit();
      console.log('✅ AuditLogs table created successfully');
    } catch (e) {
      await transaction.rollback();
      console.error('❌ Error creating AuditLogs table:', e.message);
      throw e;
    }
  },

  down: async ({ sequelize, queryInterface }) => {
    const transaction = await sequelize.transaction();
    try {
      await queryInterface.dropTable('AuditLogs', { transaction }).catch(() => {});
      await transaction.commit();
      console.log('✅ AuditLogs table dropped successfully');
    } catch (e) {
      await transaction.rollback();
      console.error('❌ Error dropping AuditLogs table:', e.message);
      throw e;
    }
  }
};
