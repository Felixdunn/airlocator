import { NextRequest, NextResponse } from "next/server";

// Input validation utilities for API routes

export function validateAddress(address: string): boolean {
  // Basic Solana address validation (base58, 32-44 chars)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(input: string): string {
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
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
  
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return { page: parsedPage, limit: 20, error: 'Limit must be between 1 and 100' };
  }
  
  return { page: parsedPage, limit: parsedLimit };
}

// Middleware wrapper for API routes with validation
export function withValidation(
  handler: (request: NextRequest) => Promise<NextResponse>,
  validators: {
    requireAuth?: boolean;
    requireWallet?: boolean;
    maxBodySize?: number;
  } = {}
) {
  return async function validatedHandler(request: NextRequest): Promise<NextResponse> {
    // Check content type for POST/PUT requests
    if (['POST', 'PUT'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return NextResponse.json(
          { success: false, error: 'Content-Type must be application/json' },
          { status: 400 }
        );
      }
    }
    
    // Validate wallet address if required
    if (validators.requireWallet) {
      const walletAddress = request.headers.get('x-wallet-address');
      if (!walletAddress || !validateAddress(walletAddress)) {
        return NextResponse.json(
          { success: false, error: 'Valid wallet address required' },
          { status: 400 }
        );
      }
    }
    
    return handler(request);
  };
}
