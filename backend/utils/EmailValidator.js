const validator = require('validator');
const dns = require('dns').promises;

/**
 * List of known disposable email domains
 * This should be updated regularly or fetched from a service
 */
const DISPOSABLE_DOMAINS = [
    'tempmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'fakeinbox.com',
    'trashmail.com',
    'yopmail.com',
    'maildrop.cc',
    'sharklasers.com',
    'guerrillamail.info',
    'grr.la',
    'guerrillamail.biz',
    'guerrillamail.de',
    'spam4.me',
    'getairmail.com',
    'dispostable.com',
    'emailondeck.com'
];

/**
 * Advanced Email Validator
 * Validates email format, checks for disposable emails, and verifies DNS MX records
 */
class EmailValidator {
    constructor() {
        this.disposableDomains = new Set(DISPOSABLE_DOMAINS);
        this.dnsCache = new Map(); // Cache DNS results for 1 hour
        this.cacheTTL = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Basic format validation
     */
    isValidFormat(email) {
        if (!email || typeof email !== 'string') return false;
        return validator.isEmail(email, {
            allow_display_name: false,
            require_display_name: false,
            allow_utf8_local_part: false,
            require_tld: true,
            allow_ip_domain: false,
            domain_specific_validation: true
        });
    }

    /**
     * Check if email domain is disposable
     */
    isDisposable(email) {
        try {
            const domain = email.toLowerCase().split('@')[1];
            return this.disposableDomains.has(domain);
        } catch {
            return false;
        }
    }

    /**
     * Verify DNS MX records
     */
    async verifyDNS(email) {
        try {
            const domain = email.split('@')[1];

            // Check cache first
            const cached = this.dnsCache.get(domain);
            if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
                return cached.valid;
            }

            // Resolve MX records
            const mxRecords = await dns.resolveMx(domain);
            const valid = mxRecords && mxRecords.length > 0;

            // Cache result
            this.dnsCache.set(domain, {
                valid,
                timestamp: Date.now()
            });

            return valid;
        } catch (error) {
            // DNS lookup failed - domain doesn't exist or no MX records
            return false;
        }
    }

    /**
     * Comprehensive email validation
     */
    async validate(email, options = {}) {
        const {
            checkFormat = true,
            checkDisposable = true,
            checkDNS = true,
            allowDisposable = false
        } = options;

        const result = {
            valid: true,
            email: email?.toLowerCase(),
            errors: []
        };

        // 1. Format validation
        if (checkFormat && !this.isValidFormat(email)) {
            result.valid = false;
            result.errors.push('INVALID_FORMAT');
            return result; // No point checking further
        }

        // 2. Disposable email check
        if (checkDisposable && !allowDisposable && this.isDisposable(email)) {
            result.valid = false;
            result.errors.push('DISPOSABLE_EMAIL');
        }

        // 3. DNS MX record verification
        if (checkDNS) {
            const dnsValid = await this.verifyDNS(email);
            if (!dnsValid) {
                result.valid = false;
                result.errors.push('INVALID_DOMAIN');
            }
        }

        return result;
    }

    /**
     * Quick validation (format + disposable only, no DNS)
     */
    async quickValidate(email) {
        return this.validate(email, { checkDNS: false });
    }

    /**
     * Add custom disposable domain
     */
    addDisposableDomain(domain) {
        this.disposableDomains.add(domain.toLowerCase());
    }

    /**
     * Remove domain from disposable list
     */
    removeDisposableDomain(domain) {
        this.disposableDomains.delete(domain.toLowerCase());
    }

    /**
     * Clear DNS cache
     */
    clearCache() {
        this.dnsCache.clear();
    }

    /**
     * Normalize email
     */
    normalize(email) {
        return validator.normalizeEmail(email, {
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
            outlookdotcom_remove_subaddress: false,
            yahoo_remove_subaddress: false,
            icloud_remove_subaddress: false
        });
    }
}

// Export singleton instance
module.exports = new EmailValidator();
