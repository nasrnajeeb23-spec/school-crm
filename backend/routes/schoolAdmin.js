const express = require('express');
const router = express.Router({ mergeParams: true });
const { verifyToken, requireSameSchoolParam } = require('../middleware/auth');
const { enforceActiveSubscription } = require('../middleware/subscription');

// Middleware applied to all school admin routes
router.use(verifyToken);
// We usually want to ensure the user belongs to the school being accessed, 
// unless they are SuperAdmin. `requireSameSchoolParam` handles this.
// Note: Some legacy routes might have been loose, but best practice is to apply this here 
// if all routes under /api/school/:schoolId/* require it.
// Checking `classes.js` etc., they re-apply it. It's safe to apply globally here 
// if strictly all are scoped. However, let's keep it granular inside sub-routers 
// or apply here if we are confident.
// Given strict refactor, let's allow sub-routers to handle specific perms, but enforce generic "access" here?
// The original file had `verifyToken` on specific routes mostly, but clustered.
// We will rely on sub-routers having their specific generic checks, but we can standardise.

// Mount Sub-Controllers
router.use('/dashboard', require('./schoolAdmin/dashboard'));
router.use('/rbac', require('./schoolAdmin/rbac'));
router.use('/settings', require('./schoolAdmin/settings'));

router.use('/students', require('./schoolAdmin/students'));
router.use('/teachers', require('./schoolAdmin/teachers'));
router.use('/parents', require('./schoolAdmin/parents'));
router.use('/staff', require('./schoolAdmin/staff'));

router.use('/classes', require('./schoolAdmin/classes'));
router.use('/grades', require('./schoolAdmin/grades'));
router.use('/events', require('./schoolAdmin/events'));

router.use('/finance', require('./schoolAdmin/finance'));
router.use('/payroll', require('./schoolAdmin/payroll'));
router.use('/subscription', require('./schoolAdmin/subscription'));

router.use('/reports', require('./schoolAdmin/reports'));
router.use('/jobs', require('./schoolAdmin/jobs'));

// Fallback for un-migrated or root routes if any (None expected based on analysis)
// If there were any "top-level" routes in schoolAdmin.js that didn't fit a category, 
// they would be here. Based on analysis, everything fit into the 15 categories.

module.exports = router;
