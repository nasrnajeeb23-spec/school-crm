// Simple migration runner for accounting migrations only
const { sequelize } = require('../models');

async function runAccountingMigrations() {
    try {
        console.log('=== Running Accounting Migrations ===\n');

        // Connect to database
        await sequelize.authenticate();
        console.log('✓ Database connected\n');

        const queryInterface = sequelize.getQueryInterface();

        // Add describeTable method
        queryInterface.describeTable = async (tableName) => {
            try {
                const [results] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
        `);
                const desc = {};
                results.forEach(row => {
                    desc[row.column_name] = {
                        type: row.data_type,
                        allowNull: row.is_nullable === 'YES'
                    };
                });
                return desc;
            } catch (error) {
                return {};
            }
        };

        // Run migration 013
        console.log('▶ Running: 013_create_accounting_tables.js');
        const migration013 = require('../migrations/013_create_accounting_tables.js');
        await migration013.up({ context: queryInterface });
        console.log('✓ Completed: 013_create_accounting_tables.js\n');

        // Run migration 014
        console.log('▶ Running: 014_seed_default_accounts.js');
        const migration014 = require('../migrations/014_seed_default_accounts.js');
        await migration014.up({ context: queryInterface });
        console.log('✓ Completed: 014_seed_default_accounts.js\n');

        // Run migration 015
        console.log('▶ Running: 015_add_accountant_role.js');
        const migration015 = require('../migrations/015_add_accountant_role.js');
        await migration015.up({ context: queryInterface });
        console.log('✓ Completed: 015_add_accountant_role.js\n');

        console.log('=== All Accounting Migrations Completed Successfully! ===');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ Migration failed:');
        console.error(error);
        process.exit(1);
    }
}

runAccountingMigrations();
