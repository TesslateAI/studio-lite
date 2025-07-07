/**
 * Cloudflare Pages deployment using single shared project
 * User-specific file paths for instant deployments
 */

import { createHash } from 'crypto';

export interface DeploymentConfig {
  apiToken: string;
  accountId: string;
}

export interface DeploymentResponse {
  url: string;
  deploymentId: string;
  userId: string;
  filePath: string;
}

export interface DeploymentOptions {
  userId: string;
  htmlContent?: string; // Keep for backward compatibility
  files?: Record<string, string>; // New: multiple files
  deploymentId?: string;
}

export class SimpleCloudflareDeployment {
  private config: DeploymentConfig;
  private baseUrl = 'https://api.cloudflare.com/client/v4';
  private readonly SHARED_PROJECT_NAME = 'tesslate-designer-shared';
  private readonly BASE_DOMAIN = 'https://apps.tesslate.com';

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  /**
   * Deploy HTML content to shared project with user-specific path
   */
  async deployArtifact(options: DeploymentOptions): Promise<DeploymentResponse> {
    const { userId, htmlContent, files, deploymentId } = options;
    
    // Generate deployment ID if not provided
    const finalDeploymentId = deploymentId || this.generateDeploymentId();
    
    // Generate unique code for user email and sanitize deployment ID
    const userCode = this.generateEmailCode(userId);
    const sanitizedDeploymentId = this.sanitizePathComponent(finalDeploymentId);
    
    // Create user-specific file path using unique code
    const filePath = `users/${userCode}/${sanitizedDeploymentId}`;
    
    try {
      console.log(`Deploying to shared project: ${this.SHARED_PROJECT_NAME}`);
      console.log(`File path: ${filePath}/index.html`);
      
      // Deploy to shared project with specific file path
      await this.retryOperation(() => this.deployToSharedProject(filePath, htmlContent, files), 2);
      
      // Ensure custom domain is configured for the shared project
      await this.ensureCustomDomainConfigured();
      
      // Generate path-based URL (instant access, no DNS propagation)
      const finalUrl = `${this.BASE_DOMAIN}/${filePath}`;
      
      console.log(`Deployment successful: ${finalUrl}`);
      
      return {
        url: finalUrl,
        deploymentId: finalDeploymentId,
        userId: userCode,
        filePath: filePath
      };
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing deployment with new content
   */
  async updateDeployment(options: DeploymentOptions): Promise<DeploymentResponse> {
    const { userId, htmlContent, files, deploymentId } = options;
    
    if (!deploymentId) {
      throw new Error('Deployment ID is required for updates');
    }
    
    // Generate secure user code and sanitize deployment ID
    const userCode = this.generateEmailCode(userId);
    const sanitizedDeploymentId = this.sanitizePathComponent(deploymentId);
    const filePath = `users/${userCode}/${sanitizedDeploymentId}`;
    
    try {
      console.log(`Updating deployment: ${filePath}/index.html`);
      
      // Update content in shared project
      await this.retryOperation(() => this.deployToSharedProject(filePath, htmlContent, files), 2);
      
      // Ensure custom domain is still configured
      await this.ensureCustomDomainConfigured();
      
      const finalUrl = `${this.BASE_DOMAIN}/${filePath}`;
      console.log(`Update successful: ${finalUrl}`);
      
      return {
        url: finalUrl,
        deploymentId: sanitizedDeploymentId,
        userId: userCode,
        filePath: filePath
      };
    } catch (error) {
      console.error('Update deployment failed:', error);
      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(operation: () => Promise<T>, maxRetries: number): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Generate a unique deployment ID
   */
  private generateDeploymentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `deploy-${timestamp}-${random}`;
  }

  /**
   * Generate a unique code for an email using HMAC with 'tesslate' key
   * Ensures XSS-safe output with only alphanumeric characters and hyphens
   */
  private generateEmailCode(email: string): string {
    // Sanitize input email first
    const sanitizedEmail = email.toLowerCase().trim().replace(/[^\w@.-]/g, '');
    
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', 'tesslate');
    hmac.update(sanitizedEmail);
    const hash = hmac.digest('hex');
    
    // Take first 12 characters (guaranteed to be [a-f0-9])
    const shortHash = hash.substring(0, 12);
    
    // Format as groups of 4 with hyphens: xxxx-xxxx-xxxx
    // This creates a pattern like: a1b2-c3d4-e5f6
    const formatted = shortHash.match(/.{1,4}/g)?.join('-') || shortHash;
    
    // Final sanitization: ensure only alphanumeric and hyphens
    return formatted.replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Sanitize path components to prevent directory traversal and ensure safe filenames
   */
  private sanitizePathComponent(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9@._-]/g, '-') // Replace unsafe chars with dashes
      .replace(/\.\./g, '') // Remove directory traversal attempts
      .replace(/^[-.]|[-.]$/g, '') // Remove leading/trailing dashes and dots
      .substring(0, 100); // Limit length
  }

  /**
   * Deploy files to shared project using Cloudflare API (preserves other users' files)
   */
  private async deployToSharedProject(filePath: string, htmlContent?: string, files?: Record<string, string>): Promise<any> {
    console.log(`Deploying to shared project: ${this.SHARED_PROJECT_NAME}`);
    console.log(`Target path: ${filePath}`);
    
    // Validate required environment variables
    if (!this.config.apiToken || !this.config.accountId) {
      throw new Error('Missing required Cloudflare credentials: API_TOKEN and ACCOUNT_ID');
    }
    
    // Ensure shared project exists (create if needed)
    await this.ensureSharedProjectExists();
    
    // Prepare files for upload
    const filesToUpload: Record<string, string> = {};
    
    if (files && Object.keys(files).length > 0) {
      // Use provided files
      for (const [fileName, content] of Object.entries(files)) {
        const cleanFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
        const fullPath = `${filePath}/${cleanFileName}`;
        filesToUpload[fullPath] = content;
      }
    } else if (htmlContent) {
      // Fallback: Use HTML content
      filesToUpload[`${filePath}/index.html`] = htmlContent;
    } else {
      throw new Error('No content provided for deployment');
    }
    
    // Upload files using Cloudflare Pages API
    const deploymentId = await this.createDeployment(filesToUpload);
    
    return {
      id: deploymentId,
      filePath: filePath
    };
  }

  /**
   * Create a new deployment using Cloudflare Pages API
   */
  private async createDeployment(files: Record<string, string>): Promise<string> {
    const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${this.SHARED_PROJECT_NAME}/deployments`;
    
    // Convert files to the format expected by Cloudflare API
    const manifest: Record<string, any> = {};
    const fileHashes: string[] = [];
    
    for (const [filePath, content] of Object.entries(files)) {
      const hash = createHash('sha256').update(content).digest('hex');
      manifest[filePath] = hash;
      fileHashes.push(hash);
    }
    
    // Create deployment
    const deployResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manifest: manifest,
        branch: 'main',
        stage: 'queued'  // Add the required stage field
      })
    });
    
    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to create deployment: ${error}`);
    }
    
    const deployment = await deployResponse.json();
    const deploymentId = deployment.result.id;
    
    // Upload files
    for (const [filePath, content] of Object.entries(files)) {
      const hash = manifest[filePath];
      await this.uploadFile(deploymentId, hash, content);
    }
    
    // Finalize deployment
    await this.finalizeDeployment(deploymentId);
    
    console.log(`Deployment created successfully: ${deploymentId}`);
    return deploymentId;
  }

  /**
   * Upload a single file to the deployment
   */
  private async uploadFile(deploymentId: string, hash: string, content: string): Promise<void> {
    const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${this.SHARED_PROJECT_NAME}/deployments/${deploymentId}/files/${hash}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: content
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload file ${hash}: ${error}`);
    }
  }

  /**
   * Finalize the deployment
   */
  private async finalizeDeployment(deploymentId: string): Promise<void> {
    const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${this.SHARED_PROJECT_NAME}/deployments/${deploymentId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stage: 'deploy'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to finalize deployment: ${error}`);
    }
  }

  /**
   * Ensure the shared project exists (create if needed)
   */
  private async ensureSharedProjectExists(): Promise<void> {
    try {
      // Try to get project info to see if it exists
      const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${this.SHARED_PROJECT_NAME}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.apiToken}` }
      });
      
      if (response.ok) {
        console.log(`Shared project ${this.SHARED_PROJECT_NAME} already exists`);
        return;
      }
      
      // Project doesn't exist, create it
      console.log(`Creating shared project: ${this.SHARED_PROJECT_NAME}`);
      await this.createSharedProject();
      
    } catch (error) {
      console.warn('Error checking/creating shared project:', error);
      // Continue - project might exist and deployment will handle it
    }
  }

  /**
   * Create the shared project via API
   */
  private async createSharedProject(): Promise<void> {
    const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: this.SHARED_PROJECT_NAME,
        production_branch: 'main'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create shared project: ${error}`);
    }
    
    console.log(`Successfully created shared project: ${this.SHARED_PROJECT_NAME}`);
  }

  /**
   * Ensure custom domain is configured for the shared project
   */
  private async ensureCustomDomainConfigured(): Promise<void> {
    try {
      const domain = 'apps.tesslate.com';
      const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${this.SHARED_PROJECT_NAME}/domains`;

      // Check if domain already exists
      const checkResponse = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.apiToken}` }
      });

      if (checkResponse.ok) {
        const domains = await checkResponse.json();
        const domainExists = domains.result?.some((d: any) => d.name === domain);
        
        if (domainExists) {
          console.log(`Custom domain ${domain} already configured`);
          return;
        }
      }

      // Add the custom domain
      console.log(`Adding custom domain: ${domain}`);
      const addResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: domain })
      });

      if (!addResponse.ok) {
        const error = await addResponse.json();
        console.warn(`Failed to add custom domain: ${error.errors?.[0]?.message || addResponse.statusText}`);
      } else {
        console.log(`Successfully added custom domain: ${domain}`);
      }

    } catch (error) {
      console.warn('Error configuring custom domain:', error);
      // Continue anyway - fallback to pages.dev URL
    }
  }

  /**
   * Generate worker script for routing user files
   * @deprecated - Reserved for future worker implementation
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _generateWorkerScript(): string {
    return `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle user-specific file requests
    if (path.startsWith('/users/')) {
      // Extract user and deployment ID from path
      const pathParts = path.split('/');
      if (pathParts.length >= 4) {
        const userId = pathParts[2];
        const deploymentId = pathParts[3];
        
        // Serve the index.html file for this user/deployment
        const assetPath = \`users/\${userId}/\${deploymentId}/index.html\`;
        
        try {
          // Try multiple asset paths since Cloudflare Pages structure can vary
          const possiblePaths = [
            \`\${assetPath}\`,
            \`/\${assetPath}\`,
            assetPath.replace('users/', '')
          ];
          
          for (const tryPath of possiblePaths) {
            try {
              const asset = await env.ASSETS.fetch(new URL(\`/\${tryPath}\`, request.url));
              if (asset.status === 200) {
                return new Response(await asset.text(), {
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=3600'
                  }
                });
              }
            } catch (e) {
              continue;
            }
          }
        } catch (error) {
          console.error('Error serving asset:', error);
        }
      }
      
      // Return 404 if file not found
      return new Response('Deployment not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Handle root and other requests
    if (path === '/' || path === '') {
      return new Response(\`
<!DOCTYPE html>
<html>
<head>
    <title>Tesslate Designer</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; }
        h1 { color: #5E62FF; }
        .deployment { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>Tesslate Designer</h1>
    <p>This is the shared deployment project for Tesslate Designer.</p>
    <p>User deployments are available at: <code>/users/{userId}/{deploymentId}</code></p>
    <a href="https://tesslate.com">← Back to Tesslate</a>
</body>
</html>\`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // For all other requests, try to serve as static asset
    return env.ASSETS.fetch(request);
  }
};`;
  }

  // Legacy methods removed - using shared project deployment instead
}

/**
 * Factory function to create deployment service
 */
export function createSimpleDeploymentService(): SimpleCloudflareDeployment | null {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  // Validate environment variables
  if (!apiToken || !accountId) {
    console.warn('Cloudflare credentials not configured:', {
      hasApiToken: !!apiToken,
      hasAccountId: !!accountId,
      envVars: {
        CLOUDFLARE_API_TOKEN: apiToken ? `${apiToken.substring(0, 8)}...` : 'missing',
        CLOUDFLARE_ACCOUNT_ID: accountId ? `${accountId.substring(0, 8)}...` : 'missing'
      }
    });
    return null;
  }

  // Validate format
  if (apiToken.length < 20 || accountId.length < 20) {
    console.error('Invalid Cloudflare credentials format');
    return null;
  }

  return new SimpleCloudflareDeployment({
    apiToken,
    accountId
  });
}