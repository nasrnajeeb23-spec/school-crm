#!/bin/bash

# School CRM Security Checklist for Production Deployment
# This script validates that all security measures are in place

set -e

echo "🔒 School CRM Security Validation Checklist"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Test function
test_security() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command"; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ FAILED${NC}"
            ((FAILED++))
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ FAILED${NC}"
            ((FAILED++))
        fi
    fi
}

warning() {
    local message="$1"
    echo -e "${YELLOW}⚠️  WARNING: $message${NC}"
    ((WARNINGS++))
}

# 1. Environment Variables Security
echo "1️⃣  Environment Variables Security"
echo "-----------------------------------"

# Check if .env.production exists
if [ -f "backend/.env.production" ]; then
    echo -e "${GREEN}✅ .env.production file exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ .env.production file missing${NC}"
    ((FAILED++))
fi

# Check JWT_SECRET
test_security "JWT_SECRET is not default" \
    "! grep -q 'your_super_secret_jwt_key_here' backend/.env.production" \
    "pass"

# Check LICENSE_SECRET  
test_security "LICENSE_SECRET is not default" \
    "! grep -q 'your_super_secret_license_key_here' backend/.env.production" \
    "pass"

# Check DATABASE_URL
test_security "DATABASE_URL uses PostgreSQL" \
    "grep -q 'postgres://' backend/.env.production" \
    "pass"

# 2. CORS Configuration
echo ""
echo "2️⃣  CORS Configuration"
echo "---------------------"

test_security "CORS_ORIGIN is configured" \
    "grep -q 'CORS_ORIGIN=' backend/.env.production" \
    "pass"

test_security "CORS_ORIGIN is not wildcard" \
    "! grep -q 'CORS_ORIGIN=*' backend/.env.production" \
    "pass"

# 3. Rate Limiting
echo ""
echo "3️⃣  Rate Limiting"
echo "-----------------"

test_security "Rate limiting is configured" \
    "grep -q 'RATE_LIMIT' backend/.env.production" \
    "pass"

# 4. File Upload Security
echo ""
echo "4️⃣  File Upload Security"
echo "------------------------"

test_security "MAX_FILE_SIZE is configured" \
    "grep -q 'MAX_FILE_SIZE' backend/.env.production" \
    "pass"

test_security "File upload limits are reasonable" \
    "grep -q '10485760' backend/.env.production" \
    "pass"

# 5. Docker Security
echo ""
echo "5️⃣  Docker Security"
echo "-------------------"

# Check if Dockerfile uses non-root user
test_security "Dockerfile uses non-root user" \
    "grep -q 'USER nodejs' backend/Dockerfile" \
    "pass"

# Check if health check is configured
test_security "Dockerfile has health check" \
    "grep -q 'HEALTHCHECK' backend/Dockerfile" \
    "pass"

# 6. Nginx Security
echo ""
echo "6️⃣  Nginx Security"
echo "------------------"

# Check if nginx.conf exists
if [ -f "nginx/nginx.conf" ]; then
    echo -e "${GREEN}✅ nginx.conf exists${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ nginx.conf missing${NC}"
    ((FAILED++))
fi

# Check security headers
test_security "Nginx has security headers" \
    "grep -q 'X-Frame-Options' nginx/nginx.conf" \
    "pass"

test_security "Nginx has SSL configuration" \
    "grep -q 'ssl_protocols TLSv1.2 TLSv1.3' nginx/nginx.conf" \
    "pass"

# 7. Database Security
echo ""
echo "7️⃣  Database Security"
echo "--------------------"

test_security "PostgreSQL version is recent" \
    "grep -q 'postgres:15' docker-compose.prod.yml" \
    "pass"

# 8. Deployment Security
echo ""
echo "8️⃣  Deployment Security"
echo "-----------------------"

# Check deploy script
test_security "Deploy script validates environment" \
    "grep -q 'validate_environment' deploy/deploy.sh" \
    "pass"

test_security "Deploy script creates backups" \
    "grep -q 'create_backup' deploy/deploy.sh" \
    "pass"

test_security "Deploy script checks for root user" \
    "grep -q 'EUID -eq 0' deploy/deploy.sh" \
    "pass"

# 9. CI/CD Security
echo ""
echo "9️⃣  CI/CD Security"
echo "------------------"

# Check GitHub Actions
test_security "CI/CD validates secrets" \
    "grep -q 'Validate environment secrets' .github/workflows/deploy.yml" \
    "pass"

test_security "CI/CD runs security scan" \
    "grep -q 'security-scan' .github/workflows/deploy.yml" \
    "pass"

# 10. Code Security
echo ""
echo "🔟 Code Security"
echo "----------------"

# Check for SQL injection prevention
test_security "Uses parameterized queries (Sequelize)" \
    "grep -q 'sequelize' backend/package.json" \
    "pass"

# Check for input validation
test_security "Has input validation middleware" \
    "grep -q 'validate' backend/middleware/validate.js" \
    "pass"

# Additional Manual Checks
echo ""
echo "🔍 Additional Manual Checks Required"
echo "====================================="
echo ""

echo "1. 🔑 SSH Key Security:"
echo "   - Ensure SSH keys are properly configured in GitHub Secrets"
echo "   - Use strong SSH key algorithms (RSA 4096+ or ED25519)"
echo "   - Rotate SSH keys regularly"
echo ""

echo "2. 🌐 Domain and SSL:"
echo "   - Configure your actual domain in CORS_ORIGIN"
echo "   - Obtain valid SSL certificates from Let's Encrypt"
echo "   - Configure DNS properly"
echo ""

echo "3. 🔥 Firewall Configuration:"
echo "   - Allow only necessary ports (22, 80, 443)"
echo "   - Configure fail2ban for intrusion prevention"
echo "   - Set up rate limiting at firewall level"
echo ""

echo "4. 📧 Email Configuration:"
echo "   - Configure SMTP settings for notifications"
echo "   - Set up email alerts for security events"
echo "   - Test email delivery"
echo ""

echo "5. 🗄️ Database Security:"
echo "   - Change default PostgreSQL credentials"
echo "   - Enable PostgreSQL logging"
echo "   - Configure automatic backups"
echo "   - Set up database monitoring"
echo ""

echo "6. 🚀 Performance Monitoring:"
echo "   - Set up application monitoring (e.g., New Relic, DataDog)"
echo "   - Configure log aggregation"
echo "   - Set up alerting for performance issues"
echo ""

echo "7. 🔄 Regular Maintenance:"
echo "   - Schedule regular security updates"
echo "   - Monitor vulnerability databases"
echo "   - Review access logs regularly"
echo "   - Update dependencies monthly"
echo ""

# Summary
echo "📊 Security Validation Summary"
echo "==============================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Excellent! All security tests passed.${NC}"
    echo "Your application is ready for production deployment."
else
    echo -e "${RED}❌ Security issues found!${NC}"
    echo "Please fix the failed tests before deploying to production."
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Please review the warnings above.${NC}"
fi

echo ""
echo "📚 Next Steps:"
echo "1. Complete the manual checks listed above"
echo "2. Test the application thoroughly"
echo "3. Set up monitoring and alerting"
echo "4. Create incident response procedures"
echo "5. Schedule regular security audits"
echo ""
echo "🚀 Ready for production deployment!"