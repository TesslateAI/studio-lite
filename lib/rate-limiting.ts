import { NextRequest } from 'next/server';

// Rate limiting interface for different storage backends
interface RateLimitStorage {
  get(key: string): Promise<RateLimitData | null>;
  set(key: string, data: RateLimitData, ttlMs: number): Promise<void>;
  increment(key: string, ttlMs: number): Promise<RateLimitData>;
  cleanup(): Promise<void>;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  windowStart: number;
}

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory storage (fallback for development)
class InMemoryStorage implements RateLimitStorage {
  private store = new Map<string, RateLimitData>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key: string): Promise<RateLimitData | null> {
    const data = this.store.get(key);
    if (!data) return null;
    
    // Check if expired
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return data;
  }

  async set(key: string, data: RateLimitData, ttlMs: number): Promise<void> {
    this.store.set(key, {
      ...data,
      resetTime: Date.now() + ttlMs
    });
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitData> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (!existing) {
      const newData: RateLimitData = {
        count: 1,
        resetTime: now + ttlMs,
        windowStart: now
      };
      await this.set(key, newData, ttlMs);
      return newData;
    }
    
    existing.count++;
    await this.set(key, existing, existing.resetTime - now);
    return existing;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Database storage (recommended for production)
class DatabaseStorage implements RateLimitStorage {
  private tableName = 'rate_limits';

  async get(key: string): Promise<RateLimitData | null> {
    // Implementation would use your database connection
    // For now, fall back to in-memory
    console.warn('DatabaseStorage not implemented, falling back to in-memory storage');
    return null;
  }

  async set(key: string, data: RateLimitData, ttlMs: number): Promise<void> {
    // Implementation would use your database connection
    console.warn('DatabaseStorage not implemented');
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitData> {
    // Implementation would use your database connection
    throw new Error('DatabaseStorage not implemented');
  }

  async cleanup(): Promise<void> {
    // Implementation would clean expired entries from database
    console.warn('DatabaseStorage cleanup not implemented');
  }
}

// Redis storage (ideal for production)
class RedisStorage implements RateLimitStorage {
  private redis: any; // Redis client type

  constructor(redisClient?: any) {
    this.redis = redisClient;
    if (!this.redis) {
      console.warn('Redis client not provided, rate limiting may not work correctly in production');
    }
  }

  async get(key: string): Promise<RateLimitData | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, data: RateLimitData, ttlMs: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, Math.ceil(ttlMs / 1000), JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitData> {
    if (!this.redis) {
      throw new Error('Redis client not available');
    }

    const now = Date.now();
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();
      
      const count = results[0][1];
      
      return {
        count,
        resetTime: now + ttlMs,
        windowStart: now
      };
    } catch (error) {
      console.error('Redis increment error:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, no cleanup needed
  }
}

// Rate limiter class
export class RateLimiter {
  private storage: RateLimitStorage;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig, storage?: RateLimitStorage) {
    this.config = {
      keyGenerator: (req: NextRequest) => this.getClientIP(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Choose storage backend based on environment
    if (storage) {
      this.storage = storage;
    } else if (process.env.REDIS_URL) {
      // In production with Redis
      this.storage = new RedisStorage();
    } else {
      // Use in-memory storage for development and as fallback
      this.storage = new InMemoryStorage();
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️  Using in-memory rate limiting in production. Consider using Redis or database storage.');
      }
    }
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }

  async checkLimit(req: NextRequest, identifier?: string): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
    totalRequests: number;
  }> {
    const key = identifier || this.config.keyGenerator(req);
    const rateLimitKey = `rate_limit:${key}`;
    
    try {
      const data = await this.storage.increment(rateLimitKey, this.config.windowMs);
      
      const allowed = data.count <= this.config.requests;
      const remainingRequests = Math.max(0, this.config.requests - data.count);
      
      return {
        allowed,
        remainingRequests,
        resetTime: data.resetTime,
        totalRequests: data.count
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remainingRequests: this.config.requests - 1,
        resetTime: Date.now() + this.config.windowMs,
        totalRequests: 1
      };
    }
  }

  async resetLimit(req: NextRequest, identifier?: string): Promise<void> {
    const key = identifier || this.config.keyGenerator(req);
    const rateLimitKey = `rate_limit:${key}`;
    
    try {
      await this.storage.set(rateLimitKey, {
        count: 0,
        resetTime: Date.now() + this.config.windowMs,
        windowStart: Date.now()
      }, this.config.windowMs);
    } catch (error) {
      console.error('Rate limit reset failed:', error);
    }
  }
}

// Pre-configured rate limiters for different endpoints
export const chatRateLimiter = new RateLimiter({
  requests: 60,
  windowMs: 60 * 1000, // 1 minute
});

export const authRateLimiter = new RateLimiter({
  requests: 5,
  windowMs: 60 * 1000, // 1 minute
});

export const generalRateLimiter = new RateLimiter({
  requests: 100,
  windowMs: 60 * 1000, // 1 minute
});

// Helper function for Next.js API routes
export async function withRateLimit(
  req: NextRequest,
  rateLimiter: RateLimiter,
  identifier?: string
): Promise<Response | null> {
  const result = await rateLimiter.checkLimit(req, identifier);
  
  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      resetTime: result.resetTime,
      remainingRequests: result.remainingRequests
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': rateLimiter['config'].requests.toString(),
        'X-RateLimit-Remaining': result.remainingRequests.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      }
    });
  }
  
  return null; // Request allowed
}