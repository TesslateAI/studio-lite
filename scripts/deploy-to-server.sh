#!/bin/bash

# Deployment script to Ubuntu VM
# Configure these variables for your server
SERVER_USER="your-username"
SERVER_HOST="your-server-ip"
SERVER_PATH="/var/www/studio-lite"
PM2_APP_NAME="studio-lite"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploying Studio Lite to production server${NC}"

# Check if server variables are configured
if [ "$SERVER_USER" = "your-username" ] || [ "$SERVER_HOST" = "your-server-ip" ]; then
  echo -e "${RED}❌ Please configure SERVER_USER and SERVER_HOST in this script first!${NC}"
  exit 1
fi

# Build locally first
echo -e "${YELLOW}Building application locally...${NC}"
./scripts/build-and-deploy.sh

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
tar -czf deploy.tar.gz -C build-output .

# Upload to server
echo -e "${YELLOW}Uploading to server...${NC}"
scp deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

# Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  # Navigate to app directory
  cd $SERVER_PATH || exit 1
  
  # Backup current deployment
  if [ -d "current" ]; then
    echo "Backing up current deployment..."
    mv current backup-$(date +%Y%m%d-%H%M%S)
  fi
  
  # Extract new deployment
  echo "Extracting new deployment..."
  mkdir current
  tar -xzf /tmp/deploy.tar.gz -C current
  
  # Copy environment variables
  if [ -f ".env.local" ]; then
    cp .env.local current/
  fi
  
  # Install production dependencies on server
  cd current
  npm install --production
  
  # Restart with PM2
  echo "Restarting application with PM2..."
  pm2 stop $PM2_APP_NAME || true
  pm2 start server.js --name $PM2_APP_NAME
  pm2 save
  
  # Clean up
  rm /tmp/deploy.tar.gz
  
  echo "✅ Deployment complete!"
ENDSSH

# Clean up local files
rm deploy.tar.gz

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "Your app should be running at http://$SERVER_HOST:3001"