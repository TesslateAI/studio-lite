import { NextRequest, NextResponse } from 'next/server';
import { AuthenticatedRequest } from './middleware';

interface RateLimitData {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitData>();

export interface RateLimitConfig {
  requests: number; // Number of requests allowed
  window: number;   // Time window in milliseconds
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

export function rateLimit(config: RateLimitConfig) {
  return function <T extends NextRequest>(handler: (req: T) => Promise<NextResponse>) {
    return async (req: T): Promise<NextResponse> => {
      // Generate rate limit key
      const key = config.keyGenerator 
        ? config.keyGenerator(req)
        : getDefaultKey(req);

      const now = Date.now();
      const data = rateLimitStore.get(key);

      // Clean up expired entries periodically
      if (Math.random() < 0.01) { // 1% chance to cleanup
        cleanupExpiredEntries(now);
      }

      if (!data || now > data.resetTime) {
        // First request or window expired
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.window
        });
        return await handler(req);
      }

      if (data.count >= config.requests) {
        // Rate limit exceeded
        console.warn('Rate limit exceeded', {
          key: key.substring(0, 20) + '...',
          count: data.count,
          limit: config.requests,
          resetTime: new Date(data.resetTime).toISOString(),
          timestamp: new Date().toISOString()
        });

        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((data.resetTime - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((data.resetTime - now) / 1000).toString(),
              'X-RateLimit-Limit': config.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(data.resetTime / 1000).toString()
            }
          }
        );
      }

      // Increment counter
      data.count++;
      rateLimitStore.set(key, data);

      // Add rate limit headers
      const response = await handler(req);
      response.headers.set('X-RateLimit-Limit', config.requests.toString());
      response.headers.set('X-RateLimit-Remaining', (config.requests - data.count).toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000).toString());

      return response;
    };
  };
}

function getDefaultKey(req: NextRequest): string {
  // Use IP address as default key
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0] : (realIp || 'unknown');
  return `rate-limit:${ip}:${req.nextUrl.pathname}`;
}

function cleanupExpiredEntries(now: number) {
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Very strict for chat API
  CHAT: { requests: 30, window: 60 * 1000 }, // 30 requests per minute
  
  // Moderate for general API
  API: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
  
  // Lenient for authentication
  AUTH: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
  
  // Very strict for admin operations
  ADMIN: { requests: 20, window: 60 * 1000 }, // 20 requests per minute
} as const;