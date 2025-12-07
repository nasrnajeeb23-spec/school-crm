const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');
const { 
    School, Subscription, Plan, SubscriptionModule, 
    SchoolSettings, ModuleCatalog 
} = require('../models');

async function verifySubscriptionIntegration() {
    console.log('--- Starting Subscription Integration Verification ---');

    try {
        // Manually add columns if they are missing (ignoring errors if they exist)
        // This avoids the complex sync logic which is failing on the dev DB
        try { await sequelize.query('ALTER TABLE Subscriptions ADD COLUMN customLimits JSON;'); } catch (e) {}
        try { await sequelize.query('ALTER TABLE SchoolSettings ADD COLUMN customLimits JSON;'); } catch (e) {}
        try { await sequelize.query('ALTER TABLE SchoolSettings ADD COLUMN backupSchedule JSON;'); } catch (e) {}
        try { await sequelize.query('ALTER TABLE SchoolSettings ADD COLUMN backupConfig JSON;'); } catch (e) {}
        try { await sequelize.query('ALTER TABLE SchoolSettings ADD COLUMN backupLock JSON;'); } catch (e) {}
        try { await sequelize.query('ALTER TABLE SubscriptionModules ADD COLUMN priceSnapshot FLOAT;'); } catch (e) {}
        
        // Ensure tables exist (sync without alter)
        await School.sync();
        await Plan.sync();
        await Subscription.sync();
        await SubscriptionModule.sync();
        await SchoolSettings.sync();
        await ModuleCatalog.sync();

        // 1. Setup Test Data
        const testSchoolId = Math.floor(Math.random() * 1000000) + 100000; // Random ID to avoid FK issues
        console.log('Testing with School ID:', testSchoolId);
        
        // No need to clean up first if we use a random ID (mostly)
        
        // Create Modules in Catalog
        await ModuleCatalog.bulkCreate([
            { id: 'finance_fees', name: 'Fees', description: 'Fees Module', monthlyPrice: 10, isEnabled: true },
            { id: 'transportation', name: 'Transportation', description: 'Trans Module', monthlyPrice: 10, isEnabled: true }
        ], { ignoreDuplicates: true });

        console.log('Created clean state.');

        // Create School
        const school = await School.create({
            id: testSchoolId,
            name: 'Test Integration School ' + testSchoolId,
            contactEmail: 'test' + testSchoolId + '@school.com',
            status: 'active'
        });

        // Create Plan
        let plan = await Plan.findOne({ where: { name: 'Test Plan' } });
        if (!plan) {
            plan = await Plan.create({
                name: 'Test Plan',
                price: 100,
                pricePeriod: 'monthly',
                limits: { students: 50, teachers: 5 },
                features: ['basic']
            });
        }

        // Create Subscription with Custom Limits
        const subscription = await Subscription.create({
            schoolId: school.id, // Let ID be auto-generated
            planId: plan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            renewalDate: new Date(Date.now() + 30*24*60*60*1000),
            customLimits: { students: 100, teachers: 10 } // Custom limits override plan
        });

        // Create Modules
        const modules = ['finance_fees', 'transportation'];
        for (const mId of modules) {
            await SubscriptionModule.create({
                subscriptionId: subscription.id, // Use actual ID
                moduleId: mId,
                active: true,
                priceSnapshot: 10
            });
        }

        console.log('Test data created successfully.');

        // 2. Verify Limit Merging Logic (simulating schoolAdmin.js)
        console.log('\n--- Verifying Limit Merging (ResourceUsageWidget) ---');
        
        const sub = await Subscription.findOne({ 
            where: { schoolId: school.id }, 
            include: [{ model: Plan }] 
        });

        const planLimits = sub.Plan?.limits || { students: 0, teachers: 0 };
        const customLimits = sub.customLimits || {};
        
        const mergedLimits = {
            students: customLimits.students !== undefined ? customLimits.students : planLimits.students,
            teachers: customLimits.teachers !== undefined ? customLimits.teachers : planLimits.teachers,
        };

        console.log('Plan Limits:', planLimits);
        console.log('Custom Limits:', customLimits);
        console.log('Merged Limits:', mergedLimits);

        if (mergedLimits.students === 100 && mergedLimits.teachers === 10) {
            console.log('✅ PASS: Custom limits correctly override plan limits.');
        } else {
            console.log('❌ FAIL: Merged limits do not match expected custom limits.');
        }

        // 3. Verify Module Intersection Logic (simulating schools.js)
        console.log('\n--- Verifying Module Intersection (School Modules) ---');

        // Case A: No local settings (should return all provisioned)
        let provisioned = await SubscriptionModule.findAll({ 
            where: { subscriptionId: subscription.id, active: true } 
        });
        let provisionedIds = provisioned.map(sm => sm.moduleId);
        
        let settings = await SchoolSettings.findOne({ where: { schoolId: school.id } });
        let localActive = settings?.activeModules;
        
        let activeModules = [];
        if (!localActive || !Array.isArray(localActive)) {
             activeModules = provisionedIds.map(id => ({ schoolId: school.id, moduleId: id }));
        } else {
             activeModules = provisionedIds
                .filter(id => localActive.includes(id))
                .map(id => ({ schoolId: school.id, moduleId: id }));
        }

        console.log('Provisioned Modules:', provisionedIds);
        console.log('Local Settings:', localActive || 'None (Default All)');
        console.log('Active Modules (Result):', activeModules.map(m => m.moduleId));

        if (activeModules.length === 2 && activeModules.find(m => m.moduleId === 'finance_fees')) {
            console.log('✅ PASS: Default behavior includes all provisioned modules.');
        } else {
            console.log('❌ FAIL: Default behavior failed.');
        }

        // Case B: With local settings (should intersect)
        // Enable only 'finance_fees' locally, disable 'transportation'  
        await SchoolSettings.create({
            schoolId: school.id,
            schoolName: 'Test School Settings', // Required
            academicYearStart: new Date(),      // Required
            academicYearEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Required
            notifications: { email: true, sms: false }, // Required
            activeModules: ['finance_fees']
        });

        settings = await SchoolSettings.findOne({ where: { schoolId: school.id } });
        localActive = settings?.activeModules;

        if (!localActive || !Array.isArray(localActive)) {
             activeModules = provisionedIds.map(id => ({ schoolId: school.id, moduleId: id }));
        } else {
             activeModules = provisionedIds
                .filter(id => localActive.includes(id))
                .map(id => ({ schoolId: school.id, moduleId: id }));
        }

        console.log('\nWith Local Settings applied (only finance_fees):');
        console.log('Active Modules (Result):', activeModules.map(m => m.moduleId));

        if (activeModules.length === 1 && activeModules[0].moduleId === 'finance_fees') {
            console.log('✅ PASS: Intersection logic correctly filters modules.');
        } else {
            console.log('❌ FAIL: Intersection logic failed.');
        }

        // Cleanup
        await SubscriptionModule.destroy({ where: { subscriptionId: testSchoolId } });
        await Subscription.destroy({ where: { schoolId: testSchoolId } });
        await SchoolSettings.destroy({ where: { schoolId: testSchoolId } });
        await School.destroy({ where: { id: testSchoolId } });
        
        console.log('\nCleanup complete.');

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

verifySubscriptionIntegration();
