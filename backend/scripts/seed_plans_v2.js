const { Sequelize } = require('sequelize');
const { Plan, sequelize } = require('../models');

const plans = [
    {
        name: 'الخطة الأساسية', // Starter
        price: 50,
        pricePeriod: 'monthly',
        features: ['all_modules', 'basic_support'],
        limits: {
            students: 100,
            staff: 10,
            storageGB: 5,
            invoices: 100
        },
        recommended: false
    },
    {
        name: 'الخطة المتقدمة', // Growth
        price: 150,
        pricePeriod: 'monthly',
        features: ['all_modules', 'priority_support', 'advanced_reports'],
        limits: {
            students: 500,
            staff: 50,
            storageGB: 50,
            invoices: 1000
        },
        recommended: true
    },
    {
        name: 'الخطة المؤسسية', // Enterprise
        price: 300,
        pricePeriod: 'monthly',
        features: ['all_modules', 'dedicated_account_manager', 'api_access'],
        limits: {
            students: 2000,
            staff: 200,
            storageGB: 200,
            invoices: 999999 // Unlimited
        },
        recommended: false
    }
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Optional: Clear existing plans if you want a clean slate
        // await Plan.destroy({ where: {} });

        for (const p of plans) {
            const [plan, created] = await Plan.findOrCreate({
                where: { name: p.name },
                defaults: p
            });

            if (!created) {
                await plan.update(p);
                console.log(`Updated plan: ${p.name}`);
            } else {
                console.log(`Created plan: ${p.name}`);
            }
        }

        console.log('Plans seeded successfully (Resource-Based Pricing).');
        process.exit(0);
    } catch (error) {
        console.error('Seeding plans failed:', error);
        process.exit(1);
    }
}

seed();
