import { NextRequest, NextResponse } from 'next/server';
import { createDeploymentService } from '@/lib/cloudflare-deployment';

interface DeployRequest {
  subdomain: string;
  projectData: {
    html?: string;
    code?: string;
    title?: string;
    timestamp: string;
  };
}

interface CloudflareDeployment {
  subdomain: string;
  content: string;
  timestamp: string;
}

// Mock deployment store (in production, use a database)
const deployments = new Map<string, CloudflareDeployment>();

export async function POST(request: NextRequest) {
  try {
    const body: DeployRequest = await request.json();
    const { subdomain, projectData } = body;

    if (!subdomain || !projectData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract HTML content from project data
    const htmlContent = projectData.html || projectData.code || '<html><body><h1>Generated UI</h1></body></html>';
    
    // Store deployment data
    deployments.set(subdomain, {
      subdomain,
      content: htmlContent,
      timestamp: projectData.timestamp,
    });

    const deploymentUrl = `https://${subdomain}.designer.tesslate.com`;

    // Check if Cloudflare credentials are available
    const hasCloudflareConfig = process.env.CLOUDFLARE_API_TOKEN && 
                               process.env.CLOUDFLARE_ZONE_ID && 
                               process.env.CLOUDFLARE_ACCOUNT_ID;

    if (hasCloudflareConfig) {
      // Use real Cloudflare deployment
      const deploymentService = createDeploymentService();
      
      // Create DNS record
      const dnsSuccess = await deploymentService.createDNSRecord(subdomain);
      if (!dnsSuccess) {
        console.warn('Failed to create DNS record, continuing with mock deployment');
      }
      
      // Deploy to hosting service
      const deployedUrl = await deploymentService.deployToHosting(subdomain, htmlContent);
      if (deployedUrl) {
        // Configure caching and SSL
        await Promise.all([
          deploymentService.configureCaching(subdomain),
          deploymentService.setupSSL(subdomain)
        ]);
      }
    } else {
      // Simulate deployment for development
      await simulateCloudflareDeployment(subdomain, htmlContent);
    }

    return NextResponse.json({
      success: true,
      url: deploymentUrl,
      subdomain,
      timestamp: new Date().toISOString(),
      mode: hasCloudflareConfig ? 'production' : 'simulation'
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json(
      { error: 'Subdomain parameter required' },
      { status: 400 }
    );
  }

  const deployment = deployments.get(subdomain);
  
  if (!deployment) {
    return NextResponse.json(
      { error: 'Deployment not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(deployment);
}

async function simulateCloudflareDeployment(subdomain: string, htmlContent: string) {
  // In production, this would make actual API calls to:
  // 1. Cloudflare DNS API to create CNAME record
  // 2. Your hosting service to deploy the HTML
  // 3. Cloudflare to configure SSL and caching rules

  console.log(`Simulating deployment for ${subdomain}.designer.tesslate.com`);
  console.log(`HTML content length: ${htmlContent.length} characters`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    subdomain,
    url: `https://${subdomain}.designer.tesslate.com`,
  };
}