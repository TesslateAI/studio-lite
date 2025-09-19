#!/bin/bash

# Build and Deploy Script for Studio Lite
# This script builds the Next.js app locally and can deploy to a remote Ubuntu server

echo "🔨 Building Studio Lite for production..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf .next
rm -rf out

# Install dependencies if needed
echo "Installing dependencies..."
pnpm install

# Run TypeScript checks
echo "Running TypeScript checks..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Please fix them before building."
  exit 1
fi

# Build the application
echo "Building application..."
pnpm build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build successful!"

# Option 1: Create standalone build (recommended for deployment)
echo "Creating standalone build..."
cp -r .next/standalone ./build-output
cp -r public ./build-output/public
cp -r .next/static ./build-output/.next/static

echo "📦 Build output created in ./build-output"
echo ""
echo "To deploy to your Ubuntu VM, you can:"
echo "1. Copy the build-output folder to your server:"
echo "   scp -r ./build-output user@your-server:/path/to/app"
echo ""
echo "2. On the server, install Node.js and run:"
echo "   cd /path/to/app"
echo "   node server.js"
echo ""
echo "Or use the deploy command (configure SERVER_* variables first):"
echo "   ./scripts/deploy-to-server.sh"