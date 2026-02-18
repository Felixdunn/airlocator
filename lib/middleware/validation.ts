// Input validation utilities for API routes
// Security: Sanitize and validate all user inputs

export function validateAddress(address: string): boolean {
  // Solana address validation (base58, 32-44 chars)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Security: Sanitize strings to prevent XSS
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/&#\d+;/g, '') // Remove HTML entities
    .replace(/data:/gi, '') // Remove data: URIs
    .trim();
}

// Sanitize HTML content (basic)
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/g, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');
  
  return sanitized;
}

export function validatePagination(
  page?: string,
  limit?: string
): { page: number; limit: number; error?: string } {
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedLimit = limit ? parseInt(limit, 10) : 20;
  
  if (isNaN(parsedPage) || parsedPage < 1) {
    return { page: 1, limit: parsedLimit, error: 'Invalid page number' };
  }
  
  // Limit max results to prevent DoS
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return { page: parsedPage, limit: 20, error: 'Limit must be between 1 and 100' };
  }
  
  return { page: parsedPage, limit: parsedLimit };
}

// Validate API keys (basic format check)
export function validateApiKey(key: string, type: 'github' | 'twitter'): boolean {
  if (!key || typeof key !== 'string') return false;
  
  if (type === 'github') {
    // GitHub tokens start with ghp_, gho_, ghu_, ghs_, or ghr_
    return /^gh[pousr]_[A-Za-z0-9_]{36,}$/.test(key);
  }
  
  if (type === 'twitter') {
    // Twitter bearer tokens are long alphanumeric strings
    return /^[A-Za-z0-9]{50,}$/.test(key);
  }
  
  return false;
}

// Middleware wrapper for API routes with validation
export function withValidation(
  handler: (request: any) => Promise<any>,
  validators: {
    requireAuth?: boolean;
    requireWallet?: boolean;
    maxBodySize?: number;
  } = {}
) {
  return async function validatedHandler(request: any): Promise<any> {
    // Check content type for POST/PUT requests
    if (['POST', 'PUT'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return Response.json(
          { success: false, error: 'Content-Type must be application/json' },
          { status: 400 }
        );
      }
    }
    
    // Validate wallet address if required
    if (validators.requireWallet) {
      const walletAddress = request.headers.get('x-wallet-address');
      if (!walletAddress || !validateAddress(walletAddress)) {
        return Response.json(
          { success: false, error: 'Valid wallet address required' },
          { status: 400 }
        );
      }
    }
    
    return handler(request);
  };
}

// Rate limit key generator (anonymized IP)
export function getRateLimitKey(request: any): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  let ip = 'unknown';
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else if (realIP) {
    ip = realIP;
  } else if (request.ip) {
    ip = request.ip;
  }
  
  // Hash IP for privacy (simple hash)
  return `rate_limit:${simpleHash(ip)}`;
}

// Simple hash function for IP anonymization
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
