# Deployment Setup Guide

This guide explains how to set up the automated deployment feature that creates shareable links for generated UIs.

## Overview

The deployment feature allows users to:
1. Click "Deploy & Share" button on generated UIs
2. Automatically deploy to a random subdomain (e.g., `swift-app-123.designer.tesslate.com`)
3. Get a shareable link immediately
4. Copy the link or open it in a new tab

## Setup for Production

### 1. Cloudflare Configuration

You'll need a Cloudflare account with your `tesslate.com` domain configured.

#### Required Environment Variables

Add these to your `.env` file:

```env
# Cloudflare Configuration for Deployment
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

#### Getting Cloudflare Credentials

1. **API Token**: 
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Create a custom token with these permissions:
     - Zone:Read, Zone:Edit
     - DNS:Edit
     - Page Rules:Edit

2. **Zone ID**:
   - Go to your domain overview in Cloudflare
   - Find "Zone ID" in the right sidebar

3. **Account ID**:
   - Go to your domain overview in Cloudflare
   - Find "Account ID" in the right sidebar

### 2. Hosting Service Setup

You'll need to configure a hosting service for the actual HTML files. Options include:

- **Cloudflare Pages** (Recommended)
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**
- **Your own hosting infrastructure**

### 3. DNS Configuration

Ensure your DNS is configured to handle wildcard subdomains:
- Add a CNAME record: `*.designer.tesslate.com` → `your-hosting-service.com`

## Development Mode

Without Cloudflare credentials, the system runs in simulation mode:
- Generates random subdomains
- Simulates deployment process
- Returns mock URLs for testing

## File Structure

```
components/
  deploy-button.tsx          # Main deploy button component
app/api/
  deploy/
    route.ts                 # Deployment API endpoint
lib/
  cloudflare-deployment.ts   # Cloudflare integration service
```

## Usage

1. User generates a UI in the chat
2. "Deploy & Share" button appears below the generation card
3. User clicks the button
4. System generates random subdomain and deploys
5. User gets shareable link with copy/open options

## Security Considerations

- API tokens should be kept secure and never committed to git
- Consider rate limiting for deployment API
- Implement user authentication for production deployments
- Add cleanup for unused deployments

## Customization

You can customize:
- Subdomain generation patterns in `deploy-button.tsx`
- Deployment targets in `cloudflare-deployment.ts`
- UI styling and behavior
- Hosting service integration

## Troubleshooting

- Check Cloudflare API token permissions
- Verify zone and account IDs
- Ensure DNS propagation is complete
- Check hosting service configuration
- Review deployment logs for errors