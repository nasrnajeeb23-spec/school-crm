const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

// Language configuration for global competitiveness
const supportedLanguages = [
  { code: 'en', name: 'English', direction: 'ltr', region: 'Global' },
  { code: 'ar', name: 'العربية', direction: 'rtl', region: 'MENA' },
  { code: 'es', name: 'Español', direction: 'ltr', region: 'LATAM' },
  { code: 'fr', name: 'Français', direction: 'ltr', region: 'Europe/Africa' },
  { code: 'de', name: 'Deutsch', direction: 'ltr', region: 'Europe' },
  { code: 'zh', name: '中文', direction: 'ltr', region: 'Asia' },
  { code: 'hi', name: 'हिन्दी', direction: 'ltr', region: 'Asia' },
  { code: 'pt', name: 'Português', direction: 'ltr', region: 'LATAM/Europe' },
  { code: 'ru', name: 'Русский', direction: 'ltr', region: 'Europe/Asia' },
  { code: 'ja', name: '日本語', direction: 'ltr', region: 'Asia' }
];

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages.map(lang => lang.code),
    debug: process.env.NODE_ENV === 'development',
    
    backend: {
      loadPath: './i18n/locales/{{lng}}/{{ns}}.json',
      addPath: './i18n/locales/{{lng}}/{{ns}}.missing.json'
    },
    
    detection: {
      order: ['querystring', 'cookie', 'header', 'localStorage', 'sessionStorage'],
      caches: ['cookie'],
      cookieSecure: true,
      cookieSameSite: 'strict'
    },
    
    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
      format: function(value, format, lng) {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1);
        return value;
      }
    },
    
    // Regional and cultural settings
    regionalSettings: {
      dateFormats: {
        en: 'MM/DD/YYYY',
        ar: 'DD/MM/YYYY',
        es: 'DD/MM/YYYY',
        fr: 'DD/MM/YYYY',
        de: 'DD.MM.YYYY',
        zh: 'YYYY-MM-DD',
        hi: 'DD/MM/YYYY',
        pt: 'DD/MM/YYYY',
        ru: 'DD.MM.YYYY',
        ja: 'YYYY/MM/DD'
      },
      currencyFormats: {
        en: { symbol: '$', position: 'before' },
        ar: { symbol: 'د.إ', position: 'after' },
        es: { symbol: '€', position: 'after' },
        fr: { symbol: '€', position: 'after' },
        de: { symbol: '€', position: 'after' },
        zh: { symbol: '¥', position: 'before' },
        hi: { symbol: '₹', position: 'before' },
        pt: { symbol: '€', position: 'after' },
        ru: { symbol: '₽', position: 'after' },
        ja: { symbol: '¥', position: 'before' }
      },
      numberFormats: {
        en: { decimal: '.', thousand: ',' },
        ar: { decimal: '.', thousand: ',' },
        es: { decimal: ',', thousand: '.' },
        fr: { decimal: ',', thousand: ' ' },
        de: { decimal: ',', thousand: '.' },
        zh: { decimal: '.', thousand: ',' },
        hi: { decimal: '.', thousand: ',' },
        pt: { decimal: ',', thousand: '.' },
        ru: { decimal: ',', thousand: ' ' },
        ja: { decimal: '.', thousand: ',' }
      }
    }
  });

// Middleware for handling language detection and switching
const languageMiddleware = (req, res, next) => {
  // Detect user language preference
  const userLang = req.user?.preferredLanguage;
  const browserLang = req.headers['accept-language']?.split(',')[0]?.slice(0, 2);
  const schoolLang = req.school?.defaultLanguage;
  
  // Set language priority
  const targetLang = userLang || schoolLang || browserLang || 'en';
  
  if (supportedLanguages.map(l => l.code).includes(targetLang)) {
    req.language = targetLang;
    req.languageDirection = supportedLanguages.find(l => l.code === targetLang)?.direction || 'ltr';
  } else {
    req.language = 'en';
    req.languageDirection = 'ltr';
  }
  
  // Make i18next available in request
  req.t = i18next.t.bind(i18next);
  req.i18n = i18next;
  
  next();
};

// Helper function for formatting dates according to locale
const formatDate = (date, locale = 'en') => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat(locale, options).format(date);
};

// Helper function for formatting currency according to locale
const formatCurrency = (amount, locale = 'en', currency = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// Helper function for formatting numbers according to locale
const formatNumber = (number, locale = 'en', options = {}) => {
  return new Intl.NumberFormat(locale, options).format(number);
};

// RTL support utilities
const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

const isRTLLanguage = (locale) => {
  return rtlLanguages.includes(locale);
};

const getLanguageDirection = (locale) => {
  return isRTLLanguage(locale) ? 'rtl' : 'ltr';
};

// School-specific translation loader
const loadSchoolTranslations = async (schoolId, language) => {
  try {
    // Load school-specific translations if available
    const schoolTranslations = await require(`../i18n/schools/${schoolId}/${language}.json`);
    return schoolTranslations;
  } catch (error) {
    // Fallback to default translations
    return {};
  }
};

// Dynamic translation management for schools
const updateSchoolTranslations = async (schoolId, language, translations) => {
  try {
    const fs = require('fs-extra');
    const path = `./i18n/schools/${schoolId}/${language}.json`;
    
    await fs.ensureDir(`./i18n/schools/${schoolId}`);
    await fs.writeJson(path, translations, { spaces: 2 });
    
    // Reload translations
    await i18next.reloadResources(language);
    
    return true;
  } catch (error) {
    console.error('Failed to update school translations:', error);
    return false;
  }
};

module.exports = {
  i18next,
  languageMiddleware,
  formatDate,
  formatCurrency,
  formatNumber,
  isRTLLanguage,
  getLanguageDirection,
  loadSchoolTranslations,
  updateSchoolTranslations,
  supportedLanguages
};