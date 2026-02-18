// Rate limiting middleware for API routes
// Security: Prevents abuse and DoS attacks

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

// In-memory store (use Redis in production)
const requestMap = new Map<string, { count: number; resetTime: number }>();

export function getRateLimitKey(request: Request): string {
  // Get IP from headers (Vercel sets these)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  let ip = 'unknown';
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else if (realIP) {
    ip = realIP;
  }
  
  // Hash IP for privacy
  return `rate_limit:${simpleHash(ip)}`;
}

export function rateLimit(request: Request): Response | null {
  const key = getRateLimitKey(request);
  const now = Date.now();
  
  const record = requestMap.get(key);
  
  if (!record) {
    requestMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return null;
  }
  
  if (now > record.resetTime) {
    // Reset window expired
    requestMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return null;
  }
  
  record.count += 1;
  
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.resetTime),
        },
      }
    );
  }
  
  requestMap.set(key, record);
  
  return null;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestMap.entries()) {
    if (now > record.resetTime) {
      requestMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// Simple hash function for IP anonymization
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Stricter rate limit for sensitive endpoints
export function strictRateLimit(request: Request): Response | null {
  const key = getRateLimitKey(request);
  const now = Date.now();
  
  const STRICT_LIMIT = 10; // 10 requests per minute
  
  const record = requestMap.get(key);
  
  if (!record) {
    requestMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }
  
  if (now > record.resetTime) {
    requestMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }
  
  record.count += 1;
  
  if (record.count > STRICT_LIMIT) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many requests',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      }
    );
  }
  
  return null;
}
