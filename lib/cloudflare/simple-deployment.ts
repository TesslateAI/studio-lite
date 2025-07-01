/**
 * Simple Cloudflare Pages deployment for UI artifacts
 * No database storage - just deploy and return URL
 */

export interface DeploymentConfig {
  apiToken: string;
  accountId: string;
}

export interface DeploymentResponse {
  url: string;
  deploymentId: string;
  projectName: string;
}

export class SimpleCloudflareDeployment {
  private config: DeploymentConfig;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  /**
   * Deploy HTML content to a random Cloudflare Pages project
   */
  async deployArtifact(htmlContent: string): Promise<DeploymentResponse> {
    // Generate a random subdomain for this deployment
    const subdomain = this.generateSubdomain();
    const projectName = `designer-${subdomain}`;
    
    try {
      // First, create the project
      await this.createProject(projectName);
      
      // Then deploy the HTML content
      const deployment = await this.deployFiles(projectName, htmlContent);
      
      // Add custom domain
      await this.addCustomDomain(projectName, `${subdomain}.designer.tesslate.com`);
      
      return {
        url: `https://${subdomain}.designer.tesslate.com`,
        deploymentId: deployment.id,
        projectName: projectName
      };
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing deployment with new content
   */
  async updateDeployment(projectName: string, htmlContent: string): Promise<DeploymentResponse> {
    try {
      const deployment = await this.deployFiles(projectName, htmlContent);
      
      // Extract subdomain from project name (format: designer-subdomain)
      const subdomain = projectName.replace('designer-', '');
      
      return {
        url: `https://${subdomain}.designer.tesslate.com`,
        deploymentId: deployment.id,
        projectName: projectName
      };
    } catch (error) {
      console.error('Update deployment failed:', error);
      throw error;
    }
  }

  /**
   * Generate a random subdomain
   */
  private generateSubdomain(): string {
    const adjectives = ['swift', 'bright', 'clever', 'bold', 'quick', 'smart', 'zen', 'cool', 'epic', 'pure'];
    const nouns = ['app', 'site', 'demo', 'ui', 'web', 'code', 'build', 'lab', 'studio', 'craft'];
    const randomNum = Math.floor(Math.random() * 1000);
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}-${noun}-${randomNum}`;
  }

  /**
   * Create a new Cloudflare Pages project
   */
  private async createProject(projectName: string): Promise<void> {
    const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        production_branch: 'main'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create project: ${error.errors?.[0]?.message || response.statusText}`);
    }
  }

  /**
   * Deploy files to an existing project using direct upload
   */
  private async deployFiles(projectName: string, htmlContent: string): Promise<any> {
    // First, create a deployment
    const createDeploymentUrl = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${projectName}/deployments`;
    
    // Create a simple deployment with direct upload
    const deploymentData = {
      branch: 'main',
      production_environment: 'production'
    };

    const createResponse = await fetch(createDeploymentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deploymentData)
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Failed to create deployment: ${error.errors?.[0]?.message || createResponse.statusText}`);
    }

    const deployment = await createResponse.json();
    const deploymentId = deployment.result.id;

    // Upload the HTML file to the deployment
    const uploadUrl = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${projectName}/deployments/${deploymentId}/files`;
    
    const fileData = {
      files: {
        'index.html': htmlContent
      }
    };

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fileData)
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`Failed to upload files: ${error.errors?.[0]?.message || uploadResponse.statusText}`);
    }

    // Mark deployment as ready
    const readyUrl = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${projectName}/deployments/${deploymentId}`;
    
    const readyResponse = await fetch(readyUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ stage: 'READY' })
    });

    if (!readyResponse.ok) {
      const error = await readyResponse.json();
      throw new Error(`Failed to finalize deployment: ${error.errors?.[0]?.message || readyResponse.statusText}`);
    }

    return deployment.result;
  }

  /**
   * Add custom domain to a Pages project
   */
  private async addCustomDomain(projectName: string, domain: string): Promise<void> {
    const url = `${this.baseUrl}/accounts/${this.config.accountId}/pages/projects/${projectName}/domains`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domain })
    });

    if (!response.ok) {
      const error = await response.json();
      // If domain already exists, that's okay
      if (!error.errors?.[0]?.message?.includes('already exists')) {
        throw new Error(`Failed to add custom domain: ${error.errors?.[0]?.message || response.statusText}`);
      }
    }
  }
}

/**
 * Factory function to create deployment service
 */
export function createSimpleDeploymentService(): SimpleCloudflareDeployment | null {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    console.warn('Cloudflare credentials not configured');
    return null;
  }

  return new SimpleCloudflareDeployment({
    apiToken,
    accountId
  });
}