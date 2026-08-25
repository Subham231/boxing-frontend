import { NextRequest, NextResponse } from 'next/server';

// In-memory store for IP rate limiting (in production, use Redis or similar)
interface IPUsage {
  count: number;
  resetTime: number;
}

const ipUsageStore = new Map<string, IPUsage>();
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipUsageStore.entries()) {
    if (data.resetTime < now) {
      ipUsageStore.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

export function getClientIP(req: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  // Fallback to a default if no IP found
  return req.headers.get('x-vercel-forwarded-for') || 'unknown';
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs?: number;
  keyPrefix?: string;
}

export function checkRateLimit(
  ip: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${options.keyPrefix || 'default'}:${ip}`;
  const now = Date.now();
  const windowMs = options.windowMs || WINDOW_MS;
  const maxRequests = options.maxRequests;

  const existing = ipUsageStore.get(key);

  if (!existing || existing.resetTime < now) {
    // New window
    const resetTime = now + windowMs;
    ipUsageStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count, resetTime: existing.resetTime };
}

export function rateLimitMiddleware(
  req: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const ip = getClientIP(req);
  const result = checkRateLimit(ip, options);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime).toISOString();
    return NextResponse.json(
      {
        error: `Rate limit exceeded. You can only use this feature ${options.maxRequests} time(s) per day. Try again after ${resetDate}.`,
        reason: 'rate_limit_exceeded',
        resetTime: result.resetTime,
      },
      { status: 429 }
    );
  }

  return null; // No rate limit hit
}

// Specific rate limiters for our features
export const BOXING_ANALYSIS_LIMITER = {
  maxRequests: 1,
  windowMs: WINDOW_MS,
  keyPrefix: 'boxing_analysis',
};

export const FREE_SPARRING_LIMITER = {
  maxRequests: 1,
  windowMs: WINDOW_MS,
  keyPrefix: 'free_sparring',
};