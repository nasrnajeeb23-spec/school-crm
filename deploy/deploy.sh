#!/bin/bash

# School CRM Production Deployment Script
# This script handles the deployment of School CRM to production

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/opt/school-crm"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/school-crm-deploy.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
   exit 1
fi

# Check required commands
command -v docker >/dev/null 2>&1 || { error "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { error "Docker Compose is required but not installed."; exit 1; }
command -v git >/dev/null 2>&1 || { error "Git is required but not installed."; exit 1; }

log "Starting School CRM deployment..."

# Create backup
create_backup() {
    log "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "$PROJECT_DIR/docker-compose.prod.yml" ]; then
        cd "$PROJECT_DIR"
        
        # Backup database
        if docker-compose -f docker-compose.prod.yml ps | grep -q "school_crm_db"; then
            log "Backing up database..."
            docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres school_crm > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
            
            if [ $? -eq 0 ]; then
                log "Database backup created: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
            else
                warning "Database backup failed"
            fi
        fi
        
        # Backup uploads
        if [ -d "uploads" ]; then
            log "Backing up uploads..."
            tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" uploads/
            log "Uploads backup created: $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
        fi
    fi
}

# Update code
update_code() {
    log "Updating code from repository..."
    cd "$PROJECT_DIR"
    
    # Fetch latest changes
    git fetch origin
    
    # Check if there are changes
    if [ $(git rev-list HEAD...origin/main --count) -eq 0 ]; then
        log "No changes detected, skipping deployment"
        exit 0
    fi
    
    # Pull latest changes
    git pull origin main
    
    if [ $? -ne 0 ]; then
        error "Failed to pull latest changes"
        exit 1
    fi
    
    log "Code updated successfully"
}

# Validate environment
validate_environment() {
    log "Validating environment..."
    
    # Check if .env.production exists
    if [ ! -f "$PROJECT_DIR/backend/.env.production" ]; then
        error ".env.production file not found"
        exit 1
    fi
    
    # Check for required environment variables
    required_vars=("JWT_SECRET" "LICENSE_SECRET" "DATABASE_URL")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$PROJECT_DIR/backend/.env.production"; then
            error "Required environment variable $var not found in .env.production"
            exit 1
        fi
    done
    
    # Check if secrets are still default values
    if grep -q "your_super_secret_jwt_key_here" "$PROJECT_DIR/backend/.env.production"; then
        error "JWT_SECRET is still using default value. Please update it with a secure key."
        exit 1
    fi
    
    if grep -q "your_super_secret_license_key_here" "$PROJECT_DIR/backend/.env.production"; then
        error "LICENSE_SECRET is still using default value. Please update it with a secure key."
        exit 1
    fi
    
    log "Environment validation passed"
}

# Build and deploy
deploy() {
    log "Building and deploying application..."
    cd "$PROJECT_DIR"
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # Remove old images to save space
    docker image prune -f
    
    # Build and start services
    log "Building and starting services..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    if [ $? -ne 0 ]; then
        error "Deployment failed"
        exit 1
    fi
    
    log "Services started successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for services to start
    sleep 30
    
    # Check backend health
    backend_healthy=false
    for i in {1..10}; do
        if curl -f http://localhost:5000/health >/dev/null 2>&1; then
            backend_healthy=true
            break
        fi
        log "Waiting for backend to be healthy... (attempt $i/10)"
        sleep 10
    done
    
    if [ "$backend_healthy" = false ]; then
        error "Backend health check failed"
        docker-compose -f docker-compose.prod.yml logs backend | tail -50
        exit 1
    fi
    
    # Check admin interface
    if curl -f http://localhost:8080 >/dev/null 2>&1; then
        log "Admin interface is healthy"
    else
        warning "Admin interface health check failed"
    fi
    
    log "Health check passed"
}

# Cleanup old backups
cleanup() {
    log "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -name "db_backup_*.sql" -mtime +7 -delete
    find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -mtime +7 -delete
    
    log "Cleanup completed"
}

# Main deployment flow
main() {
    log "=== School CRM Deployment Started ==="
    
    create_backup
    update_code
    validate_environment
    deploy
    health_check
    cleanup
    
    log "=== Deployment completed successfully! ==="
    log "Backend API: http://localhost:5000"
    log "Admin Interface: http://localhost:8080"
    
    # Send notification (optional)
    if command -v mail >/dev/null 2>&1; then
        echo "School CRM deployment completed successfully at $(date)" | mail -s "Deployment Success" admin@your-domain.com
    fi
}

# Error handling
trap 'error "Deployment failed on line $LINENO"' ERR

# Run main function
main "$@"