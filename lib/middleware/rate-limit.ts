import { NextRequest, NextResponse } from "next/server";

// Rate limiting middleware for API routes
// Uses a simple in-memory store (for production, use Redis/Upstash)

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

const requestMap = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  // Try different headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback to IP from request (may be empty in some environments)
  return request.ip || 'unknown';
}

export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIP(request);
  const now = Date.now();
  
  const record = requestMap.get(ip);
  
  if (!record) {
    requestMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return null;
  }
  
  if (now > record.resetTime) {
    requestMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return null;
  }
  
  record.count += 1;
  
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(0),
        },
      }
    );
  }
  
  requestMap.set(ip, record);
  
  return null;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestMap.entries()) {
    if (now > record.resetTime) {
      requestMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);
