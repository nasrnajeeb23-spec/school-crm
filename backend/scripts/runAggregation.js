const AggregationService = require('../services/AggregationService');
const { sequelize } = require('../models');

const date = process.argv[2] || new Date().toISOString().split('T')[0];

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        
        console.log(`Running aggregation for date: ${date}`);
        await AggregationService.aggregateAllSchools(date);
        
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
