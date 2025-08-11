import { z } from 'zod';
import { NextRequest } from 'next/server';

// Rate limiting storage (in production, use Redis or similar)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Guest usage tracking (in production, use Redis or database)
const guestUsage = new Map<string, { messageCount: number; resetTime: number }>();

// Guest limits configuration
export const GuestLimits = {
  maxMessagesPerDay: 10,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
};

// Common validation schemas
export const CommonSchemas = {
  // User ID validation
  userId: z.string().uuid("Invalid user ID format"),
  
  // Model ID validation  
  modelId: z.string()
    .min(1, "Model ID is required")
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid model ID format"),
    
  // Message content validation
  messageContent: z.object({
    text: z.string().min(1, "Message content cannot be empty").max(500000, "Message too long"), // Increased to 500k for code generation
    type: z.string().optional(),
  }),
  
  // Message validation
  message: z.object({
    role: z.enum(['user', 'assistant', 'system'], {
      errorMap: () => ({ message: "Invalid message role" })
    }),
    content: z.array(z.object({
      type: z.string().optional(),
      text: z.string().min(1, "Message content cannot be empty").max(500000, "Message too long"), // Increased to 500k for code generation
    })).min(1, "Message must have content"),
  }),
  
  // Pagination validation
  pagination: z.object({
    page: z.number().int().min(1, "Page must be a positive integer").default(1),
    limit: z.number().int().min(1, "Limit must be positive").max(100, "Limit too large").default(20),
  }),
};

// Rate limiting configuration
export const RateLimitConfig = {
  chat: { requests: 60, windowMs: 60000 }, // 60 requests per minute
  auth: { requests: 5, windowMs: 60000 },  // 5 requests per minute
  general: { requests: 100, windowMs: 60000 }, // 100 requests per minute
};

// Get client IP address
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown'; // NextRequest doesn't have ip property in this environment
}

// Rate limiting middleware
export function checkRateLimit(
  req: NextRequest, 
  config: { requests: number; windowMs: number },
  identifier?: string
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const clientId = identifier || getClientIP(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up old entries
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < windowStart) {
      requestCounts.delete(key);
    }
  }
  
  const current = requestCounts.get(clientId);
  
  if (!current || current.resetTime < windowStart) {
    // New window
    requestCounts.set(clientId, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remainingRequests: config.requests - 1, resetTime: now + config.windowMs };
  } else {
    // Existing window
    if (current.count >= config.requests) {
      return { allowed: false, remainingRequests: 0, resetTime: current.resetTime };
    } else {
      current.count++;
      return { allowed: true, remainingRequests: config.requests - current.count, resetTime: current.resetTime };
    }
  }
}

// Validation helper
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    );
    return { success: false, errors };
  }
}

// Sanitize error messages to prevent information leakage
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Only include safe error messages
    const safeMessages = [
      'validation failed',
      'invalid input',
      'unauthorized',
      'not found',
      'rate limit exceeded',
      'bad request'
    ];
    
    const message = error.message.toLowerCase();
    if (safeMessages.some(safe => message.includes(safe))) {
      return error.message;
    }
  }
  
  return 'An internal server error occurred. Please try again later.';
}

// Guest usage tracking
export function checkGuestUsage(
  userId: string
): { allowed: boolean; remainingMessages: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - GuestLimits.windowMs;
  
  // Clean up old entries
  for (const [key, value] of guestUsage.entries()) {
    if (value.resetTime < windowStart) {
      guestUsage.delete(key);
    }
  }
  
  const current = guestUsage.get(userId);
  
  if (!current || current.resetTime < windowStart) {
    // New window
    guestUsage.set(userId, { messageCount: 1, resetTime: now + GuestLimits.windowMs });
    return { 
      allowed: true, 
      remainingMessages: GuestLimits.maxMessagesPerDay - 1, 
      resetTime: now + GuestLimits.windowMs 
    };
  } else {
    // Existing window
    if (current.messageCount >= GuestLimits.maxMessagesPerDay) {
      return { 
        allowed: false, 
        remainingMessages: 0, 
        resetTime: current.resetTime 
      };
    } else {
      current.messageCount++;
      return { 
        allowed: true, 
        remainingMessages: GuestLimits.maxMessagesPerDay - current.messageCount, 
        resetTime: current.resetTime 
      };
    }
  }
}

// Create standardized API responses
export const ApiResponse = {
  success: <T>(data: T, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  error: (message: string, status = 400, details?: string[]) => {
    const response: { error: string; details?: string[] } = { error: message };
    if (details) {
      response.details = details;
    }
    
    return new Response(JSON.stringify(response), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  rateLimited: (resetTime: number) => {
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'X-RateLimit-Reset': resetTime.toString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
      }
    });
  },
  
  unauthorized: (message = 'Unauthorized') => {
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  guestLimitExceeded: (resetTime: number, remainingMessages: number) => {
    return new Response(JSON.stringify({ 
      error: 'Guest message limit exceeded. Please sign up for unlimited access.',
      remainingMessages,
      resetTime,
      upgradeUrl: '/upgrade-account'
    }), {
      status: 429,
      headers: { 
        'Content-Type': 'application/json',
        'X-Guest-Reset': resetTime.toString(),
        'X-Guest-Remaining': remainingMessages.toString()
      }
    });
  }
};