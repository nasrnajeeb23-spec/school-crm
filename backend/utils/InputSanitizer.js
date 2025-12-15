const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const domPurify = DOMPurify(window);
const validator = require('validator');

/**
 * Input Sanitizer
 * Sanitizes and validates all user inputs to prevent XSS, SQL injection, and other attacks
 */
class InputSanitizer {
    /**
     * Sanitize email
     */
    sanitizeEmail(input) {
        if (!input) return '';
        const normalized = validator.normalizeEmail(String(input).trim());
        return normalized || '';
    }

    /**
     * Sanitize name (person name, school name, etc.)
     */
    sanitizeName(input) {
        if (!input) return '';
        // Remove HTML tags and scripts
        let sanitized = domPurify.sanitize(String(input).trim(), {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        // Remove extra whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
        // Limit length
        return sanitized.substring(0, 255);
    }

    /**
     * Sanitize phone number
     */
    sanitizePhone(input) {
        if (!input) return '';
        // Keep only digits, +, -, (, ), and spaces
        return String(input).replace(/[^0-9+\-() ]/g, '').trim();
    }

    /**
     * Sanitize text (general text input)
     */
    sanitizeText(input, maxLength = 1000) {
        if (!input) return '';
        let sanitized = domPurify.sanitize(String(input).trim(), {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        return sanitized.substring(0, maxLength);
    }

    /**
     * Sanitize HTML (for rich text editors)
     */
    sanitizeHTML(input) {
        if (!input) return '';
        return domPurify.sanitize(String(input), {
            ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'a'],
            ALLOWED_ATTR: ['href', 'target'],
            ALLOW_DATA_ATTR: false
        });
    }

    /**
     * Sanitize URL
     */
    sanitizeURL(input) {
        if (!input) return '';
        const url = String(input).trim();
        if (!validator.isURL(url, { require_protocol: true, protocols: ['http', 'https'] })) {
            return '';
        }
        return validator.escape(url);
    }

    /**
     * Sanitize number
     */
    sanitizeNumber(input, options = {}) {
        const { min, max, isInteger = false } = options;

        if (input === null || input === undefined) return null;

        let num = Number(input);
        if (isNaN(num)) return null;

        if (isInteger) num = Math.floor(num);
        if (min !== undefined && num < min) num = min;
        if (max !== undefined && num > max) num = max;

        return num;
    }

    /**
     * Sanitize boolean
     */
    sanitizeBoolean(input) {
        if (typeof input === 'boolean') return input;
        if (input === 'true' || input === '1' || input === 1) return true;
        if (input === 'false' || input === '0' || input === 0) return false;
        return null;
    }

    /**
     * Sanitize date
     */
    sanitizeDate(input) {
        if (!input) return null;
        const date = new Date(input);
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * Sanitize object (recursively sanitize all properties)
     */
    sanitizeObject(obj, schema) {
        if (!obj || typeof obj !== 'object') return {};

        const sanitized = {};

        for (const [key, config] of Object.entries(schema)) {
            const value = obj[key];

            if (value === undefined || value === null) {
                if (config.required) {
                    throw new Error(`Missing required field: ${key}`);
                }
                continue;
            }

            switch (config.type) {
                case 'email':
                    sanitized[key] = this.sanitizeEmail(value);
                    break;
                case 'name':
                    sanitized[key] = this.sanitizeName(value);
                    break;
                case 'phone':
                    sanitized[key] = this.sanitizePhone(value);
                    break;
                case 'text':
                    sanitized[key] = this.sanitizeText(value, config.maxLength);
                    break;
                case 'html':
                    sanitized[key] = this.sanitizeHTML(value);
                    break;
                case 'url':
                    sanitized[key] = this.sanitizeURL(value);
                    break;
                case 'number':
                    sanitized[key] = this.sanitizeNumber(value, config.options);
                    break;
                case 'boolean':
                    sanitized[key] = this.sanitizeBoolean(value);
                    break;
                case 'date':
                    sanitized[key] = this.sanitizeDate(value);
                    break;
                default:
                    sanitized[key] = this.sanitizeText(value);
            }
        }

        return sanitized;
    }

    /**
     * Escape SQL (for raw queries - prefer parameterized queries)
     */
    escapeSQL(input) {
        if (!input) return '';
        return String(input).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
            switch (char) {
                case '\0': return '\\0';
                case '\x08': return '\\b';
                case '\x09': return '\\t';
                case '\x1a': return '\\z';
                case '\n': return '\\n';
                case '\r': return '\\r';
                case '"':
                case "'":
                case '\\':
                case '%':
                    return '\\' + char;
                default:
                    return char;
            }
        });
    }

    /**
     * Strip HTML tags completely
     */
    stripHTML(input) {
        if (!input) return '';
        return domPurify.sanitize(String(input), {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true
        });
    }
}

// Export singleton instance
module.exports = new InputSanitizer();
