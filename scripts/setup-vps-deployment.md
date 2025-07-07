# VPS Deployment Setup Guide

## Step 1: Generate SSH Deploy Key on Your VPS

```bash
# On your VPS, create a deploy user (recommended for security)
sudo adduser deploy
sudo usermod -aG docker deploy
sudo su - deploy

# Generate SSH key pair for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
# Press Enter for no passphrase (needed for automation)

# Display the public key (add this to GitHub deploy keys)
cat ~/.ssh/github_deploy.pub

# Display the private key (add this to GitHub secrets)
cat ~/.ssh/github_deploy
```

## Step 2: Setup VPS Directory Structure

```bash
# As deploy user, create deployment directory
mkdir -p /home/deploy/tesslate-designer
cd /home/deploy/tesslate-designer

# Clone your repository (you'll need to setup deploy key first)
git clone git@github.com:yourusername/your-repo.git .

# Create production environment file
cp .env.production.template .env
# Edit .env with your production values
nano .env

# Make sure deploy user owns everything
sudo chown -R deploy:deploy /home/deploy/tesslate-designer
```

## Step 3: Configure GitHub Repository

### 3.1 Add Deploy Key (Repository Level)
1. Go to your repo → Settings → Deploy keys
2. Click "Add deploy key"
3. Title: "VPS Production Deploy"
4. Key: Paste the public key from `~/.ssh/github_deploy.pub`
5. ✅ Check "Allow write access"
6. Click "Add key"

### 3.2 Add Repository Secrets
Go to your repo → Settings → Secrets and variables → Actions

Add these secrets:

```
VPS_SSH_PRIVATE_KEY: (paste private key from ~/.ssh/github_deploy)
VPS_HOST: your.vps.ip.address
VPS_USER: deploy
DEPLOY_PATH: /home/deploy/tesslate-designer
```

## Step 4: Test SSH Connection

```bash
# Test from your local machine or GitHub codespace
ssh-keyscan -H YOUR_VPS_IP >> ~/.ssh/known_hosts
ssh -i ~/.ssh/github_deploy deploy@YOUR_VPS_IP "echo 'SSH connection successful'"
```

## Step 5: Initial Manual Deployment

```bash
# On VPS as deploy user
cd /home/deploy/tesslate-designer

# Export environment variables
export $(cat .env | grep -v '^#' | xargs)

# Initial deployment
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Check everything is running
docker-compose ps
```

## Step 6: Setup Nginx (if not done already)

```bash
# Install nginx if needed
sudo apt update && sudo apt install nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/tesslate << 'EOF'
# Designer app
server {
    listen 80;
    server_name designer.tesslate.com;
    
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
        client_max_body_size 50M;
    }
}

# LiteLLM proxy
server {
    listen 80;
    server_name litellm.tesslate.com;
    
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
        client_max_body_size 50M;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/tesslate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: Security Hardening

### 7.1 Firewall Setup
```bash
# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Optional: Change SSH port and disable password auth
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: Port 2222 (optional)
sudo systemctl restart sshd
```

### 7.2 Docker Security
```bash
# Ensure deploy user is in docker group
sudo usermod -aG docker deploy

# Set up log rotation for Docker
sudo tee /etc/logrotate.d/docker << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF
```

## Step 8: Monitoring Setup (Optional)

```bash
# Create a simple monitoring script
sudo tee /home/deploy/monitor.sh << 'EOF'
#!/bin/bash
cd /home/deploy/tesslate-designer

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "$(date): Some containers are down, restarting..." >> /var/log/tesslate-monitor.log
    docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
fi

# Check health endpoints
if ! curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "$(date): Main app health check failed" >> /var/log/tesslate-monitor.log
fi

if ! curl -sf http://localhost:4000/health > /dev/null; then
    echo "$(date): LiteLLM health check failed" >> /var/log/tesslate-monitor.log
fi
EOF

chmod +x /home/deploy/monitor.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/deploy/monitor.sh") | crontab -
```

## Security Best Practices

1. **Separate Deploy User**: Never use root for deployments
2. **SSH Key Authentication**: Disable password auth
3. **Firewall**: Only allow necessary ports
4. **Environment Variables**: Never commit secrets to git
5. **Resource Limits**: Docker containers have memory/CPU limits
6. **Regular Updates**: Keep VPS and Docker images updated
7. **Monitoring**: Set up alerts for service failures
8. **Backups**: Regular database backups

## Rollback Strategy

If deployment fails, you can quickly rollback:

```bash
# SSH into VPS
ssh deploy@YOUR_VPS_IP

cd /home/deploy/tesslate-designer

# Rollback to previous commit
git log --oneline -5  # See recent commits
git checkout PREVIOUS_COMMIT_HASH

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.production.yml down
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

## Troubleshooting

### GitHub Actions Fails
- Check repository secrets are set correctly
- Verify SSH key has write access
- Check VPS logs: `sudo journalctl -u ssh`

### Docker Issues
- Check disk space: `df -h`
- View container logs: `docker-compose logs -f`
- Restart services: `docker-compose restart`

### Nginx Issues
- Check config: `sudo nginx -t`
- View logs: `sudo tail -f /var/log/nginx/error.log`