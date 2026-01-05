const express = require('express');
const { verifyToken } = require('../middleware/auth');

// Import Routes
const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const schoolsRoutes = require('../routes/schools');
const plansRoutes = require('../routes/plans');
const paymentsRoutes = require('../routes/payments');
const subscriptionsRoutes = require('../routes/subscriptions');
const rolesRoutes = require('../routes/roles');
const teacherRoutes = require('../routes/teacher');
const parentRoutes = require('../routes/parent');
const licenseRoutes = require('../routes/license');
const packageRoutes = require('../routes/package');
const messagingRoutes = require('../routes/messaging');
const authEnterpriseRoutes = require('../routes/authEnterprise');
const authSuperAdminRoutes = require('../routes/authSuperAdmin');
const analyticsRoutes = require('../routes/analytics');
const helpRoutes = require('../routes/help');
const modulesRoutes = require('../routes/modules');
const pricingRoutes = require('../routes/pricing');
const billingRoutes = require('../routes/billing');
const contactRoutes = require('../routes/contact');
const reportsRoutes = require('../routes/reports');
const driverRoutes = require('../routes/driver');
const contentRoutes = require('../routes/content');
const utilsRoutes = require('../routes/utils');
const assignmentsRoutes = require('../routes/assignments');

// Optional Routes with fallback
let superadminRoutes;
try { superadminRoutes = require('../routes/superadmin'); } catch { superadminRoutes = express.Router(); }
let schoolAdminRoutes;
try { schoolAdminRoutes = require('../routes/schoolAdmin'); } catch { schoolAdminRoutes = express.Router(); }
let transportationRoutes;
try { transportationRoutes = require('../routes/transportation'); } catch { transportationRoutes = express.Router(); }
let paymentSettingsRoutes;
try { paymentSettingsRoutes = require('../routes/paymentSettings'); } catch { paymentSettingsRoutes = express.Router(); }
let notificationsRoutes;
try { notificationsRoutes = require('../routes/notifications'); } catch { notificationsRoutes = express.Router(); }

// Helper
const safeUse = (app, path, router) => {
    try { app.use(path, router); } catch { }
};

const init = (app, limiters) => {
    const { authLimiter } = limiters || {};

    // Mount API Routes
    app.use('/api/auth', authRoutes);
    if (authLimiter) {
        app.use('/api/auth/superadmin', authLimiter, authSuperAdminRoutes);
    } else {
        app.use('/api/auth/superadmin', authSuperAdminRoutes);
    }

    app.use('/api/users', usersRoutes);
    app.use('/api/schools', verifyToken, schoolsRoutes);
    app.use('/api/plans', plansRoutes);
    app.use('/api/payments', paymentsRoutes);
    app.use('/api/superadmin', superadminRoutes);
    app.use('/api/subscriptions', subscriptionsRoutes);
    app.use('/api/roles', rolesRoutes);
    app.use('/api/school', schoolAdminRoutes);
    app.use('/api/teacher', teacherRoutes);
    app.use('/api/billing', billingRoutes);

    app.use('/api/payment-settings', paymentSettingsRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/parent', parentRoutes);
    app.use('/api/license', licenseRoutes);
    app.use('/api/transportation', transportationRoutes);
    app.use('/api/driver', driverRoutes);

    app.use('/api/messaging', messagingRoutes);
    app.use('/api/auth/enterprise', authEnterpriseRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/help', helpRoutes);
    app.use('/api/modules', modulesRoutes);
    app.use('/api/pricing', pricingRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/content', contentRoutes);

    // New Routes (Phase 4)
    app.use('/api', assignmentsRoutes); // Assignments
    app.use('/api', utilsRoutes); // Utils (Proxy, Staff fallback, Invoices fallback)

    // Frontend Fallback Aliases (Legacy support)
    app.use('/api/dashboard', analyticsRoutes);
    app.use('/api/superadmin/subscriptions', subscriptionsRoutes);
    app.use('/superadmin', superadminRoutes);
    app.use('/dashboard', analyticsRoutes);
    app.use('/contact', contactRoutes);
    app.use('/public/schools', schoolsRoutes);
    app.use('/api/public/schools', schoolsRoutes);
    app.use('/public', schoolsRoutes);

    // Public Endpoint Alias
    app.post('/ads/request', (req, res, next) => {
        // Forward to utils router or handle directly?
        // utilsRoutes handles /ads/request if mounted at /api? 
        // This is a top-level alias: app.post('/ads/request'...)
        // We can use the handler from utilsRoutes if exported, or just redirect internally.
        // Better: reuse the logic via utilsRoutes mounted at root? No, better mounted at /api.
        // We will redefine the alias here simply by redirecting or rewriting url.
        req.url = '/api/ads/request';
        app.handle(req, res, next);
    });
};

module.exports = { init };
