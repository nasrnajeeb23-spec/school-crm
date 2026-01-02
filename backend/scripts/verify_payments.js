require('dotenv').config();
const { sequelize, PaymentMethod } = require('../models');
const express = require('express');
const paymentSettingsRoutes = require('../routes/paymentSettings');

async function verify() {
    console.log('--- Starting Payment System Verification ---');

    // 1. Database Check
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful.');

        // Check if table exists
        const tableExists = await sequelize.getQueryInterface().describeTable('PaymentMethods');
        console.log('✅ PaymentMethods table found.');
        console.log('   Columns:', Object.keys(tableExists).join(', '));

        // Check if expected columns exist
        const requiredCols = ['id', 'type', 'provider', 'accountName', 'accountNumber', 'iban', 'isActive', 'logoUrl'];
        const missing = requiredCols.filter(c => !tableExists[c]);
        if (missing.length > 0) {
            console.error('❌ Missing columns:', missing);
        } else {
            console.log('✅ All required columns are present.');
        }

    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
    }

    // 2. Model Check
    try {
        console.log('--- Testing CRUD Operations ---');
        // Create
        const method = await PaymentMethod.create({
            type: 'BANK_TRANSFER',
            provider: 'Test Bank',
            accountName: 'Test Account',
            accountNumber: '123456',
            iban: 'SA123456',
            description: 'Test Description',
            isActive: true
        });
        console.log('✅ Created PaymentMethod:', method.id);

        // Read
        const fetched = await PaymentMethod.findByPk(method.id);
        if (fetched && fetched.provider === 'Test Bank') {
            console.log('✅ Read PaymentMethod successful.');
        } else {
            console.error('❌ Read failed.');
        }

        // Update
        fetched.provider = 'Updated Bank';
        await fetched.save();
        console.log('✅ Update PaymentMethod successful.');

        // Delete
        await fetched.destroy();
        console.log('✅ Delete PaymentMethod successful.');

    } catch (error) {
        console.error('❌ model CRUD verification failed:', error.message);
    }

    // 3. Route Export Check
    if (paymentSettingsRoutes && paymentSettingsRoutes.stack) {
        console.log('✅ Payment Settings Routes exported correctly.');
        const paths = paymentSettingsRoutes.stack.map(layer => layer.route ? layer.route.path : 'middleware');
        console.log('   Defined Routes:', paths.filter(p => p !== 'middleware').join(', '));
    } else {
        console.error('❌ Payment Settings Routes file verification failed.');
    }

    console.log('--- Verification Complete ---');
    process.exit(0);
}

verify();
