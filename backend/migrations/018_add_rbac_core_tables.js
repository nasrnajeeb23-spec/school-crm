const { DataTypes } = require('sequelize');

function hasTable(tables, name) {
  const n = String(name || '').toLowerCase();
  return (tables || []).some(x => String(x || '').toLowerCase() === n);
}

function permId(key) {
  return `perm_${String(key || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;
}

function roleId(key) {
  return `role_${String(key || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;
}

function scopeId(schoolId, type, key) {
  const sid = String(schoolId || '').replace(/[^0-9]+/g, '');
  const t = String(type || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const k = String(key || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  return `scope_${sid}_${t}_${k}`;
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

      await safeCreateTable(queryInterface, tables, 'RbacPermissions', {
        id: { type: DataTypes.STRING, primaryKey: true },
        key: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeCreateTable(queryInterface, tables, 'RbacRoles', {
        id: { type: DataTypes.STRING, primaryKey: true },
        schoolId: { type: DataTypes.INTEGER, allowNull: true },
        key: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeCreateTable(queryInterface, tables, 'RbacRolePermissions', {
        id: { type: DataTypes.STRING, primaryKey: true },
        roleId: { type: DataTypes.STRING, allowNull: false },
        permissionId: { type: DataTypes.STRING, allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeCreateTable(queryInterface, tables, 'RbacScopes', {
        id: { type: DataTypes.STRING, primaryKey: true },
        schoolId: { type: DataTypes.INTEGER, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        key: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        parentScopeId: { type: DataTypes.STRING, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeCreateTable(queryInterface, tables, 'RbacUserRoleScopes', {
        id: { type: DataTypes.STRING, primaryKey: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        schoolId: { type: DataTypes.INTEGER, allowNull: false },
        roleId: { type: DataTypes.STRING, allowNull: false },
        scopeId: { type: DataTypes.STRING, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeAddIndex(queryInterface, 'RbacPermissions', ['key'], { unique: true, transaction });
      await safeAddIndex(queryInterface, 'RbacRoles', ['key'], { unique: true, transaction });
      await safeAddIndex(queryInterface, 'RbacRoles', ['schoolId'], { transaction });
      await safeAddIndex(queryInterface, 'RbacRolePermissions', ['roleId', 'permissionId'], { unique: true, transaction });
      await safeAddIndex(queryInterface, 'RbacRolePermissions', ['permissionId'], { transaction });
      await safeAddIndex(queryInterface, 'RbacScopes', ['schoolId', 'type', 'key'], { unique: true, transaction });
      await safeAddIndex(queryInterface, 'RbacScopes', ['schoolId'], { transaction });
      await safeAddIndex(queryInterface, 'RbacUserRoleScopes', ['schoolId', 'userId'], { transaction });
      await safeAddIndex(queryInterface, 'RbacUserRoleScopes', ['userId', 'roleId', 'scopeId'], { unique: true, transaction });

      const { ALL_PERMISSIONS } = require('../utils/permissionMatrix');
      const perms = Array.isArray(ALL_PERMISSIONS) ? ALL_PERMISSIONS : [];
      for (const key of perms) {
        const id = permId(key);
        const name = String(key);
        if (dialect === 'sqlite') {
          await sequelize.query(
            'INSERT OR IGNORE INTO RbacPermissions(id, key, name, description, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            { replacements: [id, key, name, null, 1], transaction }
          );
        } else {
          await sequelize.query(
            'INSERT INTO "RbacPermissions"(id, key, name, description, "isSystem", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) ON CONFLICT (key) DO NOTHING',
            { bind: [id, key, name, null, true], transaction }
          );
        }
      }

      const roles = [
        { key: 'SCHOOL_ADMIN_FULL', name: 'School Admin (Full)', description: 'Full access within a school', isSystem: true },
        { key: 'STAFF_REGISTRATION', name: 'Staff (Registration)', description: 'Student registration and attendance basics', isSystem: true },
        { key: 'STAFF_FINANCE', name: 'Staff (Finance)', description: 'Finance and reports', isSystem: true },
        { key: 'STAFF_ACADEMIC_COORDINATOR', name: 'Staff (Academic)', description: 'Classes, teachers, schedule, grades, attendance', isSystem: true },
        { key: 'STAFF_SECRETARY', name: 'Staff (Secretary)', description: 'Messaging and dashboard', isSystem: true },
        { key: 'STAFF_SUPERVISOR', name: 'Staff (Supervisor)', description: 'Attendance and reports', isSystem: true },
        { key: 'STAFF_TRANSPORT_COORDINATOR', name: 'Staff (Transportation)', description: 'Transportation management', isSystem: true },
      ];

      for (const r of roles) {
        const id = roleId(r.key);
        if (dialect === 'sqlite') {
          await sequelize.query(
            'INSERT OR IGNORE INTO RbacRoles(id, schoolId, key, name, description, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            { replacements: [id, null, r.key, r.name, r.description, r.isSystem ? 1 : 0], transaction }
          );
        } else {
          await sequelize.query(
            'INSERT INTO "RbacRoles"(id, "schoolId", key, name, description, "isSystem", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) ON CONFLICT (key) DO NOTHING',
            { bind: [id, null, r.key, r.name, r.description, true], transaction }
          );
        }
      }

      const rolePerms = new Map();
      rolePerms.set('SCHOOL_ADMIN_FULL', perms.slice());
      rolePerms.set('STAFF_REGISTRATION', ['VIEW_DASHBOARD', 'MANAGE_STUDENTS', 'MANAGE_PARENTS', 'MANAGE_ATTENDANCE']);
      rolePerms.set('STAFF_FINANCE', ['VIEW_DASHBOARD', 'MANAGE_FINANCE', 'MANAGE_REPORTS']);
      rolePerms.set('STAFF_ACADEMIC_COORDINATOR', ['VIEW_DASHBOARD', 'MANAGE_CLASSES', 'MANAGE_TEACHERS', 'MANAGE_GRADES', 'MANAGE_SCHEDULE', 'MANAGE_ATTENDANCE']);
      rolePerms.set('STAFF_SECRETARY', ['VIEW_DASHBOARD', 'MANAGE_MESSAGING']);
      rolePerms.set('STAFF_SUPERVISOR', ['VIEW_DASHBOARD', 'MANAGE_ATTENDANCE', 'MANAGE_REPORTS']);
      rolePerms.set('STAFF_TRANSPORT_COORDINATOR', ['VIEW_DASHBOARD', 'MANAGE_TRANSPORTATION']);

      for (const [roleKey, permKeys] of rolePerms.entries()) {
        const rid = roleId(roleKey);
        for (const pk of permKeys) {
          const pid = permId(pk);
          const rpid = `rp_${rid}_${pid}`.slice(0, 255);
          if (dialect === 'sqlite') {
            await sequelize.query(
              'INSERT OR IGNORE INTO RbacRolePermissions(id, roleId, permissionId, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              { replacements: [rpid, rid, pid], transaction }
            );
          } else {
            await sequelize.query(
              'INSERT INTO "RbacRolePermissions"(id, "roleId", "permissionId", "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT ("roleId","permissionId") DO NOTHING',
              { bind: [rpid, rid, pid], transaction }
            );
          }
        }
      }

      const schools = await sequelize.query('SELECT id FROM "Schools"').catch(async () => sequelize.query('SELECT id FROM Schools'));
      const schoolRows = (schools && schools[0]) || [];
      for (const row of schoolRows) {
        const schoolId = row.id;
        const sid = scopeId(schoolId, 'SCHOOL', 'root');
        if (dialect === 'sqlite') {
          await sequelize.query(
            'INSERT OR IGNORE INTO RbacScopes(id, schoolId, type, key, name, parentScopeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            { replacements: [sid, schoolId, 'SCHOOL', 'root', 'School', null], transaction }
          );
        } else {
          await sequelize.query(
            'INSERT INTO "RbacScopes"(id, "schoolId", type, key, name, "parentScopeId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) ON CONFLICT ("schoolId", type, key) DO NOTHING',
            { bind: [sid, schoolId, 'SCHOOL', 'root', 'School', null], transaction }
          );
        }
      }

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },
  down: async ({ sequelize, queryInterface }) => {
    const transaction = await sequelize.transaction();
    try {
      await queryInterface.dropTable('RbacUserRoleScopes', { transaction }).catch(() => {});
      await queryInterface.dropTable('RbacRolePermissions', { transaction }).catch(() => {});
      await queryInterface.dropTable('RbacScopes', { transaction }).catch(() => {});
      await queryInterface.dropTable('RbacRoles', { transaction }).catch(() => {});
      await queryInterface.dropTable('RbacPermissions', { transaction }).catch(() => {});
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};

