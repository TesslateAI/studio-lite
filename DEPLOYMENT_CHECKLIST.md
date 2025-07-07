# Production Deployment Checklist for Tesslate Designer

## Pre-Deployment Setup

### 1. Environment Variables
Create a production `.env` file with the following variables updated:

```bash
# === PRODUCTION URLS ===
BASE_URL="https://designer.tesslate.com"
NEXT_PUBLIC_BASE_URL="https://designer.tesslate.com"
LITELLM_PROXY_URL="http://litellm-proxy:4000"  # Internal Docker network

# === DATABASE URLs (Keep as-is for Docker) ===
POSTGRES_URL="postgresql://user:password@postgres-app:5432/app_db"
DATABASE_URL="postgresql://user:password@postgres-litellm:5432/litellm_db"

# === STRIPE (Update with production keys) ===
STRIPE_SECRET_KEY="sk_live_..."  # Your production secret key
STRIPE_WEBHOOK_SECRET="whsec_..."  # Your production webhook secret
STRIPE_PLUS_PRICE_ID="price_..."  # Your production Plus price ID
STRIPE_PRO_PRICE_ID="price_..."   # Your production Pro price ID

# === Keep all Firebase and other API keys as-is ===
```

### 2. External Service Configurations

#### Stripe Webhook Configuration
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint URL: `https://designer.tesslate.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

#### Firebase Configuration
1. Ensure Firebase project settings allow:
   - Domain: `designer.tesslate.com`
   - Authorized domains in Authentication settings
2. No webhook needed - Firebase uses service account

#### Cloudflare Configuration
1. Create two DNS records pointing to your VPS:
   - `designer.tesslate.com` → Your VPS IP
   - `litellm.tesslate.com` → Your VPS IP
2. Enable "Proxied" for both records
3. SSL/TLS settings: Set to "Full (strict)" or "Full"

### 3. Update Application Configuration

#### Update CSP Headers for Production
Edit `next.config.ts`:

```typescript
// Add production domains to connect-src
connect-src 'self' 
  https://api.stripe.com 
  https://checkout.stripe.com 
  https://api.openai.com 
  https://identitytoolkit.googleapis.com 
  https://securetoken.googleapis.com 
  https://*.firebaseio.com 
  https://*.googleapis.com 
  https://litellm.tesslate.com  // Add this
  wss://designer.tesslate.com   // Add this for WebSocket
  wss://litellm.tesslate.com;   // Add this if needed
```

## Deployment Steps

### 1. On Your VPS

```bash
# 1. Clone repository
git clone <your-repo> tesslate-designer
cd tesslate-designer

# 2. Create production .env file
nano .env  # Add all production environment variables

# 3. Export environment variables
export $(cat .env | grep -v '^#' | xargs)

# 4. Build and start services
docker-compose up -d

# 5. Check all services are healthy
docker-compose ps
docker-compose logs -f  # Check for any errors
```

### 2. Nginx Configuration (on VPS)

Create two server blocks for reverse proxy:

```nginx
# /etc/nginx/sites-available/designer.tesslate.com
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
    }
}

# /etc/nginx/sites-available/litellm.tesslate.com
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
    }
}
```

Enable sites and restart nginx:
```bash
sudo ln -s /etc/nginx/sites-available/designer.tesslate.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/litellm.tesslate.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Post-Deployment Verification

### 1. Internal Docker Networking
```bash
# Verify all containers can communicate
docker exec tesslate_next_app ping postgres-app
docker exec tesslate_next_app ping litellm-proxy
docker exec tesslate_litellm_proxy ping redis
```

### 2. Database Connectivity
```bash
# Check Next.js can connect to PostgreSQL
docker exec tesslate_next_app psql "postgresql://user:password@postgres-app:5432/app_db" -c "SELECT 1"

# Check LiteLLM can connect to its database
docker exec tesslate_litellm_proxy psql "postgresql://user:password@postgres-litellm:5432/litellm_db" -c "SELECT 1"
```

### 3. Application Endpoints
Test these URLs:
- [ ] https://designer.tesslate.com - Main app loads
- [ ] https://designer.tesslate.com/sign-in - Auth works
- [ ] https://litellm.tesslate.com/health - LiteLLM health check
- [ ] https://designer.tesslate.com/api/models - API endpoint works

### 4. Firebase Authentication
- [ ] Sign up with email/password
- [ ] Sign in works
- [ ] Session persists on refresh

### 5. Stripe Integration
- [ ] Pricing page shows correct prices
- [ ] Checkout redirects to Stripe
- [ ] Webhook receives events (check logs)

### 6. Chat Functionality
- [ ] Chat interface loads
- [ ] Messages stream properly
- [ ] Model selection works

## Troubleshooting

### Common Issues

1. **CSP Violations in Console**
   - Check browser console for blocked resources
   - Update CSP in next.config.ts accordingly

2. **Stripe Price Not Found**
   - Verify price IDs match your Stripe account
   - Ensure using correct test/live keys

3. **Firebase Auth Errors**
   - Check authorized domains in Firebase Console
   - Verify service account JSON is properly formatted

4. **Container Can't Connect**
   - Ensure all services are on `tesslate_network`
   - Check container names match in connection strings

5. **502 Bad Gateway**
   - Check if containers are running: `docker-compose ps`
   - Verify port mappings are correct

### Logs to Monitor
```bash
# Application logs
docker-compose logs -f nextjs-app

# Database logs
docker-compose logs -f postgres-app

# LiteLLM logs
docker-compose logs -f litellm-proxy

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Security Checklist

- [ ] All sensitive environment variables are set
- [ ] Containers run without root (non-root user)
- [ ] Read-only root filesystem where possible
- [ ] Resource limits set for all containers
- [ ] CSP headers properly configured
- [ ] HTTPS enforced via Cloudflare
- [ ] Database passwords are strong
- [ ] API keys are production keys (not test)

## Backup Strategy

1. **Database Backups**
   ```bash
   # Backup app database
   docker exec tesslate_app_db pg_dump -U user app_db > backup_app_$(date +%Y%m%d).sql
   
   # Backup LiteLLM database
   docker exec tesslate_litellm_db pg_dump -U user litellm_db > backup_litellm_$(date +%Y%m%d).sql
   ```

2. **Volume Backups**
   ```bash
   # Stop containers first
   docker-compose stop
   
   # Backup volumes
   sudo tar -czf postgres_app_data_$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/tesslate_postgres_app_data
   sudo tar -czf postgres_litellm_data_$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/tesslate_postgres_litellm_data
   
   # Restart containers
   docker-compose start
   ```

## Monitoring

Set up monitoring for:
- Container health status
- Memory/CPU usage
- Disk space
- Response times
- Error rates in logs

Consider using:
- Prometheus + Grafana for metrics
- ELK stack for log aggregation
- Uptime monitoring service