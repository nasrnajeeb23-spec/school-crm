const { Sequelize } = require('sequelize');
const { ModuleCatalog, sequelize } = require('../models');

const modules = [
    {
        id: 'student_management',
        name: 'إدارة الطلاب',
        description: 'سجلات الطلاب، الملفات الشخصية، الحضور والغياب، والسلوك.',
        monthlyPrice: 0,
        isCore: true,
        isEnabled: true
    },
    {
        id: 'academic_management',
        name: 'الإدارة الأكاديمية',
        description: 'إدارة الفصول، المواد الدراسية، الجدول الدراسي، والتقويم الأكاديمي.',
        monthlyPrice: 0,
        isCore: true,
        isEnabled: true
    },
    {
        id: 'finance',
        name: 'المالية والحسابات',
        description: 'إدارة الرسوم الدراسية، الفواتير، المدفوعات، والمصاريف التشغيلية.',
        monthlyPrice: 29,
        isCore: false,
        isEnabled: true
    },
    {
        id: 'transportation',
        name: 'النقل المدرسي',
        description: 'إدارة الحافلات، المسارات، السائقين، وتتبع الطلاب.',
        monthlyPrice: 19,
        isCore: false,
        isEnabled: true
    },
    {
        id: 'advanced_reports',
        name: 'التقارير المتقدمة',
        description: 'تحليلات بيانية شاملة للأداء الأكاديمي والمالي والإداري.',
        monthlyPrice: 15,
        isCore: false,
        isEnabled: true
    },
    {
        id: 'parent_portal',
        name: 'بوابة ولي الأمر',
        description: 'واجهة لأولياء الأمور لمتابعة أبنائهم، الدرجات، الفواتير، والتواصل مع المدرسة.',
        monthlyPrice: 0,
        isCore: true,
        isEnabled: true
    },
    {
        id: 'teacher_portal',
        name: 'بوابة المعلم',
        description: 'واجهة خاصة للمعلمين لإدارة الفصول، رصد الدرجات، والتواصل.',
        monthlyPrice: 0,
        isCore: true,
        isEnabled: true
    },
    {
        id: 'teacher_app',
        name: 'تطبيق المعلم',
        description: 'نسخة تطبيق للهواتف الذكية (iOS/Android) للمعلمين.',
        monthlyPrice: 9,
        isCore: false,
        isEnabled: true
    }
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        for (const mod of modules) {
            const [row, created] = await ModuleCatalog.findOrCreate({
                where: { id: mod.id },
                defaults: mod
            });

            if (!created) {
                // If exists, update it to match this exact definition
                // The user wants exact alignment with system units
                await row.update(mod);
                console.log(`Updated module: ${mod.name} (${mod.id})`);
            } else {
                console.log(`Created module: ${mod.name} (${mod.id})`);
            }
        }

        console.log('All modules seeded successfully matching system ModuleId enum.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
