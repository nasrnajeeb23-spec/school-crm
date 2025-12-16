/**
 * Password Validation Utility
 * يوفر دوال للتحقق من قوة كلمات المرور
 */

/**
 * التحقق من قوة كلمة المرور
 * @param {string} password - كلمة المرور المراد فحصها
 * @returns {Object} - نتيجة الفحص مع الأخطاء إن وجدت
 */
function validatePasswordStrength(password) {
    const errors = [];
    const requirements = {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
    };

    // الحد الأدنى للطول
    if (!password || password.length < requirements.minLength) {
        errors.push(`كلمة المرور يجب أن تكون ${requirements.minLength} حرفاً على الأقل`);
    }

    // حرف كبير
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)');
    }

    // حرف صغير
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)');
    }

    // رقم
    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)');
    }

    // رمز خاص
    const specials = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";
    const hasSpecial = [...specials].some(ch => password.includes(ch));
    if (requirements.requireSpecialChars && !hasSpecial) {
        errors.push('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*...)');
    }

    // كلمات مرور شائعة يجب تجنبها
    const commonPasswords = [
        'password', 'Password123', '123456', '12345678', 'qwerty',
        'abc123', 'password123', 'admin', 'admin123', 'letmein',
        'welcome', 'monkey', '1234567890', 'password1'
    ];

    if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
        errors.push('كلمة المرور ضعيفة جداً - يرجى استخدام كلمة مرور أقوى');
    }

    return {
        valid: errors.length === 0,
        errors,
        strength: calculatePasswordStrength(password)
    };
}

/**
 * حساب قوة كلمة المرور (0-100)
 * @param {string} password
 * @returns {number} - درجة القوة من 0 إلى 100
 */
function calculatePasswordStrength(password) {
    if (!password) return 0;

    let strength = 0;

    // الطول
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 10;

    // التنوع
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    {
        const specials = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";
        const hasSpecial = [...specials].some(ch => password.includes(ch));
        if (hasSpecial) strength += 15;
    }

    return Math.min(100, strength);
}

/**
 * Express middleware للتحقق من قوة كلمة المرور
 */
function passwordStrengthMiddleware(req, res, next) {
    const password = req.body.password || req.body.newPassword;

    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'كلمة المرور مطلوبة'
        });
    }

    const validation = validatePasswordStrength(password);

    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            message: 'كلمة المرور لا تستوفي متطلبات الأمان',
            errors: validation.errors,
            strength: validation.strength
        });
    }

    next();
}

module.exports = {
    validatePasswordStrength,
    calculatePasswordStrength,
    passwordStrengthMiddleware
};
