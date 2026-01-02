const { Sequelize } = require('sequelize');
const { Plan, sequelize } = require('../models');

const plans = [
    {
<<<<<<< HEAD
        name: 'الخطة الأساسية', // Starter
        price: 50,
        pricePeriod: 'monthly',
        features: [
            'all_modules',
            'جميع وحدات النظام (الطلاب، المالية، الموارد البشرية، النقل)',
            'تطبيقات الجوال (معلم، ولي أمر)',
            'دعم فني عبر البريد الإلكتروني'
        ],
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
        features: [
            'all_modules',
            'جميع وحدات النظام (الطلاب، المالية، الموارد البشرية، النقل)',
            'تطبيقات الجوال (معلم، ولي أمر)',
            'تقارير متقدمة وتحليلات ذكية',
            'دعم فني أولوية (شات/بريد)'
        ],
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
        features: [
            'all_modules',
            'جميع وحدات النظام (الطلاب، المالية، الموارد البشرية، النقل)',
            'تطبيقات الجوال (معلم، ولي أمر)',
            'تقارير متقدمة وتحليلات ذكية',
            'مدير حساب خاص',
            'API Access'
        ],
        limits: {
            students: 2000,
            staff: 200,
            storageGB: 200,
            invoices: 999999 // Unlimited
        },
=======
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
>>>>>>> 35e46d4998a9afd69389675582106f2982ed28ae
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
