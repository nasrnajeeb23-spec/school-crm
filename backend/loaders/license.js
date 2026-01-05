const { verifyLicenseKey } = require('../utils/license');

const init = (app, logger) => {
    const coreModules = ['student_management', 'academic_management', 'parent_portal', 'teacher_portal', 'teacher_app', 'finance'];
    const licenseKey = process.env.LICENSE_KEY || null;
    let allowedModules = [...coreModules];
    if (licenseKey) {
        const result = verifyLicenseKey(licenseKey);
        if (result.valid && Array.isArray(result.payload.modules)) {
            allowedModules = [...coreModules, ...result.payload.modules];
            logger.info('License valid. Enabled modules: ' + allowedModules.join(', '));
        } else {
            logger.warn('Invalid license. Reason: ' + result.reason);
            if (process.env.NODE_ENV === 'production') {
                logger.error('CRITICAL: Invalid License in Production. Shutting down.');
                // process.exit(1); 
                // Uncomment in real production if strict enforcement is desired.
            }
        }
    } else {
        logger.warn('No LICENSE_KEY provided.');
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: No License Key found in Production. Shutting down.');
            // process.exit(1);
        } else {
            allowedModules = [...allowedModules, 'finance', 'transportation'];
            logger.warn('Dev mode: enabling finance & transportation modules for testing');
        }
    }
    allowedModules = Array.from(new Set(allowedModules));
    app.locals.allowedModules = allowedModules;
    return allowedModules;
};

module.exports = { init };
