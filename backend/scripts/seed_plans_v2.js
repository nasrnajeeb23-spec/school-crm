const { Sequelize } = require('sequelize');
const { Plan, sequelize } = require('../models');

const plans = [
    {
        id: 1,
        name: 'الأساسية',
        price: 99,
        pricePeriod: 'شهرياً',
        features: ['إدارة الطلاب', 'الحضور والغياب', 'بوابة ولي الأمر', 'بوابة المعلم', 'الرسوم والفواتير'],
        limits: { students: 200, teachers: 15, invoices: 200, storageGB: 5 },
        recommended: false
    },
    {
        id: 2,
        name: 'المميزة',
        price: 249,
        pricePeriod: 'شهرياً',
        features: ['كل ميزات الأساسية', 'التقارير المتقدمة', 'المالية المتقدمة', 'النقل المدرسي', 'دعم أولوية'],
        limits: { students: 1000, teachers: 50, invoices: 2000, storageGB: 50 },
        recommended: true
    },
    {
        id: 3,
        name: 'المؤسسات',
        price: 899,
        pricePeriod: 'تواصل معنا',
        features: ['كل ميزات المميزة', 'تقارير مخصصة', 'دعم مخصص', 'تكاملات API', 'SLA للمؤسسات'],
        limits: { students: 'غير محدود', teachers: 'غير محدود', invoices: 'غير محدود', storageGB: 'غير محدود' },
        recommended: false
    }
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        for (const p of plans) {
            const existing = await Plan.findByPk(p.id);
            if (existing) {
                await existing.update(p);
                console.log(`Updated plan: ${p.name}`);
            } else {
                await Plan.create(p);
                console.log(`Created plan: ${p.name}`);
            }
        }

        console.log('Plans seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding plans failed:', error);
        process.exit(1);
    }
}

seed();
