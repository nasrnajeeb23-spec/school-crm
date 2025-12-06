const { DataTypes } = require('sequelize');

module.exports = {
  up: async ({ queryInterface, sequelize }) => {
    const transaction = await sequelize.transaction();
    try {
      // 1. Create SchoolStats table if not exists
      const tables = await queryInterface.showAllTables();
      
      if (!tables.includes('SchoolStats')) {
        await queryInterface.createTable('SchoolStats', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          schoolId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Schools', key: 'id' },
            onDelete: 'CASCADE'
          },
          date: {
            type: DataTypes.DATEONLY,
            allowNull: false
          },
          totalStudents: { type: DataTypes.INTEGER, defaultValue: 0 },
          presentStudents: { type: DataTypes.INTEGER, defaultValue: 0 },
          attendanceRate: { type: DataTypes.FLOAT, defaultValue: 0.0 },
          totalRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
          totalExpenses: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
          newAdmissions: { type: DataTypes.INTEGER, defaultValue: 0 },
          metadata: { type: DataTypes.JSONB, defaultValue: {} },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false }
        }, { transaction });

        await queryInterface.addIndex('SchoolStats', ['schoolId', 'date'], {
          unique: true,
          transaction
        });
        console.log('Created SchoolStats table');
      }

      // 2. Create BehaviorRecords table if not exists
      // Note: Sequelize model is BehaviorRecord, table name is usually pluralized to BehaviorRecords
      // Check for BehaviorRecordsV2 as well because previous test runs might have created it or similar
      const behaviorTableName = tables.includes('BehaviorRecords') ? 'BehaviorRecords' : (tables.includes('BehaviorRecord') ? 'BehaviorRecord' : null);
      
      if (!behaviorTableName) {
        // Force create BehaviorRecords even if BehaviorRecordsV2 exists (V2 implies test/temp)
        // But if V2 is the REAL one used by app, we need to know. 
        // Model definition says tableName: 'BehaviorRecord' (implicit) -> usually BehaviorRecords
        
        await queryInterface.createTable('BehaviorRecords', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          schoolId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Schools', key: 'id' },
            onDelete: 'CASCADE'
          },
          studentId: {
            type: DataTypes.STRING,
            allowNull: false,
            references: { model: 'Students', key: 'id' },
            onDelete: 'CASCADE'
          },
          type: {
            type: DataTypes.ENUM('Positive', 'Negative'),
            allowNull: false,
            defaultValue: 'Negative'
          },
          title: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
          recordedBy: { type: DataTypes.STRING, allowNull: true },
          actionTaken: { type: DataTypes.STRING, allowNull: true },
          severity: { type: DataTypes.STRING, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: false },
          updatedAt: { type: DataTypes.DATE, allowNull: false }
        }, { transaction });
        console.log('Created BehaviorRecords table');
      }

      // 3. Fix Subscription Expiry (Extend by 1 year)
      // We execute raw SQL to be safe across environments
      await sequelize.query(
        `UPDATE "Subscriptions" SET "endDate" = :futureDate, "status" = 'ACTIVE' WHERE "endDate" < :now OR "status" != 'ACTIVE'`,
        {
          replacements: { 
            futureDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            now: new Date()
          },
          transaction
        }
      );
      console.log('Updated expired subscriptions');

      // 4. Ensure Finance is a Core Module (in case script didn't run on prod)
      const modulesTable = tables.find(t => t.toLowerCase() === 'modulecatalog' || t.toLowerCase() === 'module_catalog');
      if (modulesTable) {
         // Check if finance exists
         const [results] = await sequelize.query(`SELECT * FROM "${modulesTable}" WHERE id = 'finance'`, { transaction });
         if (results.length > 0) {
             await sequelize.query(
                 `UPDATE "${modulesTable}" SET "isCore" = true, "monthlyPrice" = 0, "oneTimePrice" = 0 WHERE id = 'finance'`,
                 { transaction }
             );
         } else {
             await sequelize.query(
                 `INSERT INTO "${modulesTable}" (id, name, description, "monthlyPrice", "oneTimePrice", currency, "isEnabled", "isCore", "createdAt", "updatedAt") VALUES ('finance', 'المالية', 'فواتير، مدفوعات، تقارير مالية.', 0, 0, 'SAR', true, true, NOW(), NOW())`,
                 { transaction }
             );
         }
         console.log('Ensured Finance is Core module');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async ({ queryInterface, sequelize }) => {
    // We generally don't want to revert these fixes automatically as they preserve data integrity
  }
};
