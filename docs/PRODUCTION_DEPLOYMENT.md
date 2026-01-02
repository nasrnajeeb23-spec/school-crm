# 🚀 School CRM Production Deployment Guide

This guide will help you deploy School CRM to production with enhanced security and performance.

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 50GB+ SSD
- **CPU**: 2+ cores
- **Network**: Static IP address

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.25+
- OpenSSL (for generating secrets)

## 🔐 Security Setup

### 1. Generate Strong Secrets

First, generate strong cryptographic secrets for production:

```bash
# Generate JWT secret (64 characters)
JWT_SECRET=$(openssl rand -hex 64)

# Generate LICENSE secret (64 characters)  
LICENSE_SECRET=$(openssl rand -hex 64)

# Generate SESSION secret (32 characters)
SESSION_SECRET=$(openssl rand -hex 32)

# Generate PostgreSQL password (32 characters)
POSTGRES_PASSWORD=$(openssl rand -hex 32)
```

### 2. SSL Certificate Setup

For production, you need valid SSL certificates:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/key.pem 4096

# Generate certificate signing request
openssl req -new -key nginx/ssl/key.pem -out nginx/ssl/cert.csr

# Generate self-signed certificate (for testing)
openssl x509 -req -days 365 -in nginx/ssl/cert.csr -signkey nginx/ssl/key.pem -out nginx/ssl/cert.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

**Note**: For production, obtain certificates from Let's Encrypt or a trusted CA.

## 🚀 Quick Deployment

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repository-url> /opt/school-crm
cd /opt/school-crm

# Create production environment file
cp backend/.env.production backend/.env.production.local
```

### 2. Configure Environment

Edit `backend/.env.production.local` with your actual values:

```bash
# Database Configuration
DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@db:5432/school_crm

# Security Keys (use generated values)
JWT_SECRET=${JWT_SECRET}
LICENSE_SECRET=${LICENSE_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Domain Configuration
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Deploy

```bash
# Make deploy script executable
chmod +x deploy/deploy.sh

# Run deployment
./deploy/deploy.sh
```

## 🔧 Manual Deployment Steps

### Step 1: Environment Validation

```bash
# Validate environment file
./deploy/deploy.sh validate_environment
```

### Step 2: Database Setup

```bash
# Start only database
docker-compose -f docker-compose.prod.yml up -d db

# Wait for database to be ready
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres
```

### Step 3: Build and Deploy

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### Step 4: Health Check

```bash
# Check backend health
curl -f http://localhost:5000/health

# Check admin interface
curl -f http://localhost:8080
```

## 📊 Monitoring

### Health Checks

The application includes several health check endpoints:

- **Backend API**: `http://localhost:5000/health`
- **Admin Interface**: `http://localhost:8080`
- **Database**: `docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres`

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f admin
docker-compose -f docker-compose.prod.yml logs -f db
```

### Performance Monitoring

```bash
# Monitor resource usage
docker stats

# Check disk usage
docker system df
```

## 🔄 Backup and Recovery

### Automated Backups

The deployment script automatically creates backups before each deployment.

### Manual Backup

```bash
# Create database backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres school_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

### Recovery

```bash
# Restore database
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres school_crm < backup_file.sql

# Restore uploads
tar -xzf uploads_backup_file.tar.gz
```

## 🛡️ Security Hardening

### Firewall Setup

```bash
# Allow specific ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Fail2ban Setup

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for SSH
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[ssh]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
EOF

sudo systemctl restart fail2ban
```

### Docker Security

```bash
# Run containers as non-root user
echo "✅ Already configured in Dockerfile"

# Limit container resources
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Test connection
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres
```

#### 2. Backend Won't Start
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep -E "(JWT|DATABASE)"
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
curl -v https://your-domain.com
```

#### 4. High Memory Usage
```bash
# Check memory usage
docker stats --no-stream

# Restart services
docker-compose -f docker-compose.prod.yml restart backend
```

### Performance Tuning

#### Database Optimization
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U postgres school_crm

# Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

#### Nginx Optimization
```bash
# Test nginx configuration
nginx -t

# Reload nginx
nginx -s reload
```

## 📞 Support

### Getting Help

1. **Check logs first**: Always check application logs for errors
2. **Health checks**: Use health check endpoints to diagnose issues
3. **Documentation**: Refer to this guide and code comments
4. **Community**: Join our community forum for help

### Emergency Contacts

- **Technical Support**: tech-support@your-domain.com
- **Security Issues**: security@your-domain.com
- **On-call**: +1-XXX-XXX-XXXX

## 📈 Updates and Maintenance

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Security Updates

```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Rebuild containers
docker-compose -f docker-compose.prod.yml build --no-cache
```

---

**⚠️ Important**: Always test updates in a staging environment before applying to production.