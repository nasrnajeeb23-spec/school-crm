// ملف إعدادات العملة اليمنية
export const CURRENCY_CONFIG = {
    code: 'YER',
    name: 'ريال يمني',
    symbol: 'ر.ي',
    decimalPlaces: 0,
    exchangeRate: 1, // مقابل الدولار (يمكن تحديثه لاحقاً)
};

// دالة تحويل الأسعار من دولار إلى ريال يمني
export const convertToYER = (dollars: number): number => {
    return Math.round(dollars * 2500); // 1 دولار = 2500 ريال يمني تقريباً
};

// دالة تنسيق المبلغ بالريال اليمني
export const formatYER = (amount: number): string => {
    return `${amount.toLocaleString('ar-YE')} ر.ي`;
};

// تصدير للاستخدام في المكونات
export default {
    CURRENCY_CONFIG,
    convertToYER,
    formatYER,
};