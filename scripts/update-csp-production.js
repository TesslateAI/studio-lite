#!/usr/bin/env node

/**
 * Script to update CSP for production deployment
 * Run this before building for production: node scripts/update-csp-production.js
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'next.config.ts');
const config = fs.readFileSync(configPath, 'utf8');

// Production CSP with all necessary domains
const productionCSP = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://connect.facebook.net https://www.googletagmanager.com https://apis.google.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com data: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://api.openai.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.googleapis.com https://litellm.tesslate.com wss://designer.tesslate.com wss://litellm.tesslate.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.firebaseapp.com https://*.codesandbox.io https://*.sandpack-static-server.codesandbox.io https://codesandbox.io https://sandpack.codesandbox.io; object-src 'none'; base-uri 'self'; worker-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;`;

// Replace the CSP value
const updatedConfig = config.replace(
  /value: "default-src[^"]+"/,
  `value: "${productionCSP}"`
);

fs.writeFileSync(configPath, updatedConfig);
console.log('✅ CSP updated for production deployment');
console.log('📝 Included domains:');
console.log('  - designer.tesslate.com (main app)');
console.log('  - litellm.tesslate.com (AI proxy)');
console.log('  - Firebase services');
console.log('  - Stripe services');
console.log('  - OpenAI API');
console.log('  - Cloudflare Insights');
console.log('  - CDN services (jsdelivr, unpkg, cdnjs)');
console.log('  - CodeSandbox (for embedded code editors)');
console.log('  - Monaco Editor');