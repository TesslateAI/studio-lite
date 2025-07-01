import { NextRequest, NextResponse } from 'next/server';
import { createSimpleDeploymentService } from '@/lib/cloudflare/simple-deployment';

interface DeployRequest {
  htmlContent: string;
  projectName?: string; // Optional - for updating existing deployment
}

export async function POST(request: NextRequest) {
  try {
    const body: DeployRequest = await request.json();
    const { htmlContent, projectName } = body;

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    // Create deployment service
    const deploymentService = createSimpleDeploymentService();

    if (!deploymentService) {
      // Fallback to mock deployment if Cloudflare is not configured
      console.log('Using mock deployment - Cloudflare not configured');
      
      // Generate subdomain in same format as real deployment
      const adjectives = ['swift', 'bright', 'clever', 'bold', 'quick', 'smart', 'zen', 'cool', 'epic', 'pure'];
      const nouns = ['app', 'site', 'demo', 'ui', 'web', 'code', 'build', 'lab', 'studio', 'craft'];
      const randomNum = Math.floor(Math.random() * 1000);
      
      const subdomain = projectName ? projectName.replace('designer-', '') : 
        `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${randomNum}`;
      
      const mockProjectName = projectName || `designer-${subdomain}`;
      const mockUrl = `https://${subdomain}.designer.tesslate.com`;
      
      return NextResponse.json({
        success: true,
        url: mockUrl,
        projectName: mockProjectName,
        deploymentId: `mock-${Date.now()}`,
        mode: 'mock'
      });
    }

    // Deploy or update deployment
    let result;
    if (projectName) {
      // Update existing deployment
      result = await deploymentService.updateDeployment(projectName, htmlContent);
    } else {
      // Create new deployment
      result = await deploymentService.deployArtifact(htmlContent);
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      projectName: result.projectName,
      deploymentId: result.deploymentId,
      mode: 'production'
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Deployment failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}