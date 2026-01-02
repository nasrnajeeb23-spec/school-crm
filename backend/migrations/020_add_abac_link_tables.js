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

      await safeCreateTable(queryInterface, tables, 'TeacherClassSubjectAssignments', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        schoolId: { type: DataTypes.INTEGER, allowNull: false },
        teacherId: { type: DataTypes.INTEGER, allowNull: false },
        classId: { type: DataTypes.STRING, allowNull: false },
        subject: { type: DataTypes.STRING, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeCreateTable(queryInterface, tables, 'ParentStudents', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        schoolId: { type: DataTypes.INTEGER, allowNull: false },
        parentId: { type: DataTypes.INTEGER, allowNull: false },
        studentId: { type: DataTypes.STRING, allowNull: false },
        relationship: { type: DataTypes.STRING, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeCreateTable(queryInterface, tables, 'DriverRoutes', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        schoolId: { type: DataTypes.INTEGER, allowNull: false },
        driverUserId: { type: DataTypes.INTEGER, allowNull: false },
        routeId: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      }, { transaction });

      await safeAddIndex(queryInterface, 'TeacherClassSubjectAssignments', ['schoolId', 'teacherId'], { transaction });
      await safeAddIndex(queryInterface, 'TeacherClassSubjectAssignments', ['schoolId', 'classId'], { transaction });
      await safeAddIndex(queryInterface, 'TeacherClassSubjectAssignments', ['teacherId', 'classId', 'subject'], { unique: true, transaction });

      await safeAddIndex(queryInterface, 'ParentStudents', ['schoolId', 'parentId'], { transaction });
      await safeAddIndex(queryInterface, 'ParentStudents', ['schoolId', 'studentId'], { transaction });
      await safeAddIndex(queryInterface, 'ParentStudents', ['parentId', 'studentId'], { unique: true, transaction });

      await safeAddIndex(queryInterface, 'DriverRoutes', ['schoolId', 'driverUserId'], { transaction });
      await safeAddIndex(queryInterface, 'DriverRoutes', ['schoolId', 'routeId'], { transaction });
      await safeAddIndex(queryInterface, 'DriverRoutes', ['driverUserId', 'routeId'], { unique: true, transaction });

      try {
        const ok = hasTable(tables, 'ParentStudents');
        if (ok) {
          if (dialect === 'sqlite') {
            await sequelize.query(
              'INSERT OR IGNORE INTO ParentStudents(schoolId, parentId, studentId, relationship, status, createdAt, updatedAt) SELECT schoolId, parentId, id as studentId, NULL as relationship, "active" as status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM Students WHERE parentId IS NOT NULL',
              { transaction }
            );
          } else {
            await sequelize.query(
              'INSERT INTO "ParentStudents"("schoolId","parentId","studentId","relationship","status","createdAt","updatedAt") SELECT "schoolId","parentId","id",NULL,\'active\',NOW(),NOW() FROM "Students" WHERE "parentId" IS NOT NULL ON CONFLICT ("parentId","studentId") DO NOTHING',
              { transaction }
            );
          }
        }
      } catch {}

      try {
        const ok = hasTable(tables, 'DriverRoutes');
        if (ok) {
          if (dialect === 'sqlite') {
            await sequelize.query(
              'INSERT OR IGNORE INTO DriverRoutes(schoolId, driverUserId, routeId, status, createdAt, updatedAt) SELECT r.schoolId, bo.userId as driverUserId, r.id as routeId, "active" as status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM Routes r JOIN BusOperators bo ON bo.id = r.busOperatorId WHERE bo.userId IS NOT NULL',
              { transaction }
            );
          } else {
            await sequelize.query(
              'INSERT INTO "DriverRoutes"("schoolId","driverUserId","routeId","status","createdAt","updatedAt") SELECT r."schoolId", bo."userId", r."id", \'active\', NOW(), NOW() FROM "Routes" r JOIN "BusOperators" bo ON bo."id" = r."busOperatorId" WHERE bo."userId" IS NOT NULL ON CONFLICT ("driverUserId","routeId") DO NOTHING',
              { transaction }
            );
          }
        }
      } catch {}

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },
  down: async ({ sequelize, queryInterface }) => {
    const transaction = await sequelize.transaction();
    try {
      await queryInterface.dropTable('DriverRoutes', { transaction }).catch(() => {});
      await queryInterface.dropTable('ParentStudents', { transaction }).catch(() => {});
      await queryInterface.dropTable('TeacherClassSubjectAssignments', { transaction }).catch(() => {});
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};

