const ArabicReshaper = require('arabic-reshaper');

/**
 * Prepares Arabic text for PDFKit (Shaping + Reversing)
 * @param {string} text 
 * @returns {string}
 */
function processArabic(text) {
    if (!text) return '';
    try {
        // Reshape Arabic characters (Connect letters)
        const shaped = ArabicReshaper.convertArabic(String(text));
        // Reverse for LTR rendering in PDFKit
        return Array.from(shaped).reverse().join('');
    } catch (e) {
        console.error('Arabic processing error:', e);
        return text;
    }
}

module.exports = { processArabic };
