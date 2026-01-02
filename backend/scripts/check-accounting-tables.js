// Check if accounting tables exist
const { sequelize } = require('../models');

async function checkTables() {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connected\n');

        const [tables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND (tablename LIKE '%account%' OR tablename LIKE '%journal%' OR tablename LIKE '%fiscal%')
      ORDER BY tablename
    `);

        console.log('Accounting-related tables found:');
        if (tables.length === 0) {
            console.log('  (none - migrations need to run)\n');
        } else {
            tables.forEach(t => console.log(`  - ${t.tablename}`));
            console.log('');
        }

        // Check if Accountant role exists
        const [roles] = await sequelize.query(`
      SELECT DISTINCT unnest(enum_range(NULL::enum_users_role))::text as role
      ORDER BY role
    `);

        console.log('Available user roles:');
        roles.forEach(r => console.log(`  - ${r.role}`));

        const hasAccountant = roles.some(r => r.role === 'Accountant');
        console.log(`\nAccountant role exists: ${hasAccountant ? '✓ YES' : '✗ NO'}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
