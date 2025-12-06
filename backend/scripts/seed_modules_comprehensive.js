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
        id: 'teacher_portal',
        name: 'بوابة المعلم',
        description: 'واجهة خاصة للمعلمين لإدارة الفصول، رصد الدرجات، والتواصل.',
        monthlyPrice: 0,
        isCore: true,
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
        id: 'teacher_app',
        name: 'تطبيق المعلم (الجوال)',
        description: 'نسخة تطبيق للهواتف الذكية (iOS/Android) للمعلمين.',
        monthlyPrice: 9,
        isCore: false,
        isEnabled: true
    },
    {
        id: 'messaging',
        name: 'الرسائل والإشعارات',
        description: 'نظام متقدم للرسائل القصيرة (SMS) والإشعارات الفورية.',
        monthlyPrice: 10,
        isCore: false,
        isEnabled: true
    },
    {
        id: 'hr_payroll',
        name: 'الموارد البشرية والرواتب',
        description: 'إدارة شؤون الموظفين، عقود العمل، وكشوف المرتبات.',
        monthlyPrice: 25,
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
                // Optional: Update existing modules to match this "master" list?
                // The user said "Add all modules... inside the database".
                // Let's update them to ensure consistency with this master list,
                // but maybe preserve isEnabled if it was manually changed?
                // For now, let's just ensure they exist.
                // Actually, let's update fields that might be missing or outdated, but respect user changes if any.
                // To be safe and strictly follow "Add all modules", upsert is better.
                await row.update(mod);
                console.log(`Updated module: ${mod.name}`);
            } else {
                console.log(`Created module: ${mod.name}`);
            }
        }

        console.log('All modules seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
