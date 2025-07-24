# Complete VM Hosting Guide for Tesslate Studio Lite

## Overview

This guide provides comprehensive instructions for hosting Tesslate Studio Lite on your own VM. The application is a full-stack Next.js application with PostgreSQL databases, Redis caching, and LiteLLM proxy for AI model access.

## System Requirements

### Hardware Requirements
- **CPU**: 4+ cores (8+ recommended)
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 50GB+ SSD
- **Network**: Stable internet connection with public IP

### Software Requirements
- **OS**: Ubuntu 22.04 LTS (recommended) or similar Linux distribution
- **Docker**: v24.0+ with Docker Compose v2.0+
- **Nginx**: For reverse proxy and SSL termination
- **Node.js**: v20+ (for development/maintenance)
- **Git**: For code deployment

## Part 1: VM Setup and Prerequisites

### 1.1 Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip nginx ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deploy user for security
sudo adduser deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# Install Node.js and pnpm (for maintenance)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm
```

### 1.2 Security Configuration

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Configure fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Optional: Change SSH port for security
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 1.3 Domain Configuration

Before proceeding, ensure you have:
1. A domain name (e.g., `yourdomain.com`)
2. DNS records pointing to your VM's IP:
   - `A` record: `designer.yourdomain.com` → `YOUR_VM_IP`
   - `A` record: `litellm.yourdomain.com` → `YOUR_VM_IP` (optional, for external LiteLLM access)

## Part 2: Application Deployment

### 2.1 Clone and Setup Application

```bash
# Switch to deploy user
sudo su - deploy

# Clone the repository
cd /home/deploy
git clone https://github.com/yourusername/studio-lite.git tesslate-studio
cd tesslate-studio

# Create production environment file
cp .env.example .env
```

### 2.2 Environment Configuration

Edit the `.env` file with your production values:

```bash
nano .env
```

**Required Environment Variables:**

```env
# === PRODUCTION URLS ===
BASE_URL="https://designer.yourdomain.com"
NEXT_PUBLIC_BASE_URL="https://designer.yourdomain.com"
LITELLM_PROXY_URL="http://litellm-proxy:4000"

# === DATABASE (Use Docker defaults) ===
POSTGRES_URL="postgresql://user:CHANGE_PASSWORD@postgres-app:5432/app_db"
DATABASE_URL="postgresql://user:CHANGE_PASSWORD@postgres-litellm:5432/litellm_db"

# === SECURITY ===
AUTH_SECRET="your-secure-random-string-here"
POSTGRES_USER="user"
POSTGRES_PASSWORD="CHANGE_TO_SECURE_PASSWORD"

# === FIREBASE AUTHENTICATION ===
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef"

# Firebase Service Account (single line JSON)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project",...}'

# === STRIPE PAYMENTS ===
STRIPE_SECRET_KEY="sk_live_your_live_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
STRIPE_PLUS_PRICE_ID="price_your_plus_price_id"
STRIPE_PRO_PRICE_ID="price_your_pro_price_id"

# === LITELLM PROXY ===
LITELLM_MASTER_KEY="sk-your-secure-master-key"

# === LLM PROVIDER API KEYS ===
GROQ_API_KEY="gsk_your_groq_key"
LLAMA_PROVIDER_API_KEY="LLM|your_llama_key"
FEATHERLESS_API_KEY="rc_your_featherless_key"

# === CLOUDFLARE (Optional - for deployment feature) ===
CLOUDFLARE_API_TOKEN="your_api_token"
CLOUDFLARE_ZONE_ID="your_zone_id"
CLOUDFLARE_ACCOUNT_ID="your_account_id"
```

### 2.3 Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication → Email/Password
3. Add your domain to authorized domains
4. Generate service account key:
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Format as single-line JSON for `FIREBASE_SERVICE_ACCOUNT`

### 2.4 Stripe Setup

1. Create Stripe account and get API keys
2. Create products and prices for Plus/Pro plans
3. Set up webhook endpoint: `https://designer.yourdomain.com/api/stripe/webhook`
4. Configure webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Part 3: Deployment

### 3.1 Deploy Application

```bash
# Ensure environment is loaded
export $(cat .env | grep -v '^#' | xargs)

# Build and start all services
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Check all services are running
docker-compose ps

# View logs to ensure everything started correctly
docker-compose logs -f
```

### 3.2 Nginx Configuration

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/tesslate-studio << 'EOF'
# Main application
server {
    listen 80;
    server_name designer.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Increase upload size for file uploads
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# Optional: External LiteLLM access
server {
    listen 80;
    server_name litellm.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Add basic auth for security (optional)
        # auth_basic "LiteLLM Admin";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
EOF

# Enable the configuration
sudo ln -sf /etc/nginx/sites-available/tesslate-studio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3 SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d designer.yourdomain.com -d litellm.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Part 4: Post-Deployment

### 4.1 Health Checks

```bash
# Test application endpoints
curl -I https://designer.yourdomain.com
curl -I https://designer.yourdomain.com/api/health

# Test LiteLLM proxy
curl -I http://localhost:4000/health

# Check database connections
docker exec tesslate_next_app psql "postgresql://user:password@postgres-app:5432/app_db" -c "SELECT 1"
```

### 4.2 Monitoring Setup

```bash
# Create monitoring script
tee /home/deploy/monitor.sh << 'EOF'
#!/bin/bash
LOGFILE="/var/log/tesslate-monitor.log"
cd /home/deploy/tesslate-studio

# Check containers
if ! docker-compose ps | grep -q "Up"; then
    echo "$(date): Containers down, restarting..." >> $LOGFILE
    docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
fi

# Check main app
if ! curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "$(date): Main app health check failed" >> $LOGFILE
fi

# Check LiteLLM
if ! curl -sf http://localhost:4000/health > /dev/null; then
    echo "$(date): LiteLLM health check failed" >> $LOGFILE
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Disk usage high: ${DISK_USAGE}%" >> $LOGFILE
fi
EOF

chmod +x /home/deploy/monitor.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/deploy/monitor.sh") | crontab -
```

### 4.3 Backup Setup

```bash
# Create backup script
tee /home/deploy/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup databases
docker exec tesslate_app_db pg_dump -U user app_db > $BACKUP_DIR/app_db_$DATE.sql
docker exec tesslate_litellm_db pg_dump -U user litellm_db > $BACKUP_DIR/litellm_db_$DATE.sql

# Backup environment file
cp /home/deploy/tesslate-studio/.env $BACKUP_DIR/env_$DATE.backup

# Compress backups older than 1 day
find $BACKUP_DIR -name "*.sql" -mtime +1 -exec gzip {} \;

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete
EOF

chmod +x /home/deploy/backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/deploy/backup.sh") | crontab -
```

## Part 5: Maintenance

### 5.1 Application Updates

```bash
# Update application
cd /home/deploy/tesslate-studio
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.production.yml down
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

### 5.2 Database Maintenance

```bash
# Access application database
docker exec -it tesslate_app_db psql -U user -d app_db

# Access LiteLLM database
docker exec -it tesslate_litellm_db psql -U user -d litellm_db

# Run migrations (if needed)
docker exec tesslate_next_app pnpm db:migrate
```

### 5.3 Log Management

```bash
# View application logs
docker-compose logs -f nextjs-app

# View database logs
docker-compose logs -f postgres-app

# View LiteLLM logs
docker-compose logs -f litellm-proxy

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Part 6: Troubleshooting

### 6.1 Common Issues

**Issue**: Application won't start
```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs

# Verify environment variables
docker exec tesslate_next_app env | grep -E "(DATABASE|FIREBASE|STRIPE)"
```

**Issue**: Database connection errors
```bash
# Check database is running
docker exec tesslate_app_db pg_isready -U user -d app_db

# Verify connection string
docker exec tesslate_next_app psql "$POSTGRES_URL" -c "SELECT 1"
```

**Issue**: 502 Bad Gateway
```bash
# Check Nginx configuration
sudo nginx -t

# Check application is listening on port 3000
sudo netstat -tlnp | grep :3000

# Restart Nginx
sudo systemctl restart nginx
```

### 6.2 Performance Optimization

```bash
# Monitor resource usage
docker stats

# Optimize database
docker exec tesslate_app_db psql -U user -d app_db -c "VACUUM ANALYZE;"

# Clean up Docker images
docker system prune -a
```

## Part 7: Security Best Practices

### 7.1 Security Checklist

- [ ] Strong passwords for all accounts
- [ ] SSH key authentication only
- [ ] Firewall configured correctly
- [ ] SSL certificates installed
- [ ] Regular security updates
- [ ] Database access restricted
- [ ] Environment variables secured
- [ ] Monitoring in place
- [ ] Regular backups

### 7.2 Security Hardening

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure log rotation
sudo tee /etc/logrotate.d/tesslate << 'EOF'
/var/log/tesslate-monitor.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 deploy deploy
}
EOF

# Set up intrusion detection
sudo fail2ban-client status
```

## Support and Troubleshooting

### Getting Help

1. Check application logs: `docker-compose logs -f`
2. Check system logs: `sudo journalctl -u nginx`
3. Monitor resource usage: `htop` or `docker stats`
4. Review security logs: `sudo tail -f /var/log/auth.log`

### Emergency Procedures

**If application is down:**
1. Check container status: `docker-compose ps`
2. Restart services: `docker-compose restart`
3. Check logs: `docker-compose logs`

**If database is corrupted:**
1. Stop application: `docker-compose stop nextjs-app`
2. Restore from backup: `docker exec tesslate_app_db psql -U user -d app_db < backup.sql`
3. Restart application: `docker-compose start nextjs-app`

This guide provides a complete setup for hosting Tesslate Studio Lite on your VM. Follow each section carefully and ensure all prerequisites are met before proceeding to the next step.