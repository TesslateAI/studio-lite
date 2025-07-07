import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check database connectivity
    const dbCheck = await db.execute(sql`SELECT 1`);
    
    // Check LiteLLM connectivity (optional)
    let litellmStatus = 'unchecked';
    if (process.env.LITELLM_PROXY_URL) {
      try {
        const response = await fetch(`${process.env.LITELLM_PROXY_URL}/health`, {
          signal: AbortSignal.timeout(5000)
        });
        litellmStatus = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        litellmStatus = 'unreachable';
      }
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      litellm: litellmStatus,
      version: process.env.npm_package_version || 'unknown'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    }, { status: 503 });
  }
}