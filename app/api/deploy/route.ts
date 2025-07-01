import { NextRequest, NextResponse } from 'next/server';
import { createSimpleDeploymentService } from '@/lib/cloudflare/simple-deployment';
import { getUser } from '@/lib/db/queries';
import { createHash, createHmac } from 'crypto';

interface DeployRequest {
  htmlContent?: string; // Keep for backward compatibility
  files?: Record<string, string>; // New: multiple files
  deploymentId?: string; // Optional - for updating existing deployment
}

/**
 * Generate secure email code with XSS protection (same logic as deployment service)
 */
function generateSecureEmailCode(email: string): string {
  // Sanitize input email first
  const sanitizedEmail = email.toLowerCase().trim().replace(/[^\w@.-]/g, '');
  
  const hmac = createHmac('sha256', 'tesslate');
  hmac.update(sanitizedEmail);
  const hash = hmac.digest('hex');
  
  // Take first 12 characters (guaranteed to be [a-f0-9])
  const shortHash = hash.substring(0, 12);
  
  // Format as groups of 4 with hyphens: xxxx-xxxx-xxxx
  const formatted = shortHash.match(/.{1,4}/g)?.join('-') || shortHash;
  
  // Final sanitization: ensure only alphanumeric and hyphens
  return formatted.replace(/[^a-z0-9-]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body: DeployRequest = await request.json();
    const { htmlContent, files, deploymentId } = body;

    if (!htmlContent && (!files || Object.keys(files).length === 0)) {
      return NextResponse.json(
        { error: 'HTML content or files are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use email as user identifier (safe for file paths)
    const userId = user.email || user.id;

    // Create deployment service
    const deploymentService = createSimpleDeploymentService();

    if (!deploymentService) {
      // Fallback to mock deployment if Cloudflare is not configured
      console.log('Using mock deployment - Cloudflare not configured');
      
      const mockDeploymentId = deploymentId || `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      const mockUserCode = generateSecureEmailCode(userId);
      const mockUrl = `https://apps.tesslate.com/users/${mockUserCode}/${mockDeploymentId}`;
      
      return NextResponse.json({
        success: true,
        url: mockUrl,
        userId: mockUserCode,
        deploymentId: mockDeploymentId,
        filePath: `users/${mockUserCode}/${mockDeploymentId}`,
        mode: 'mock'
      });
    }

    // Deploy or update deployment using shared project
    const deployOptions = {
      userId,
      htmlContent,
      files,
      deploymentId
    };

    let result;
    if (deploymentId) {
      // Update existing deployment
      result = await deploymentService.updateDeployment(deployOptions);
    } else {
      // Create new deployment
      result = await deploymentService.deployArtifact(deployOptions);
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      userId: result.userId,
      deploymentId: result.deploymentId,
      filePath: result.filePath,
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