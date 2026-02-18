# Security Documentation

## Overview

This document outlines the security measures implemented in the Solana Airdrop Tracker to protect users, data, and infrastructure.

## Architecture Security

### Server-Side Only Logic

The following sensitive operations are **never** exposed to the client:

1. **Eligibility Rules** - The specific criteria for airdrop eligibility are stored and evaluated server-side
2. **Scraping Logic** - Keyword matching, confidence scoring, and source evaluation happen on the server
3. **Wallet Scanning** - While wallet addresses are public, the scanning logic runs server-side
4. **Admin Functions** - All admin operations require authentication

### API Security

#### Rate Limiting

All API routes implement rate limiting:
- Default: 30 requests per minute per IP
- Stricter limits on sensitive endpoints
- Returns `429 Too Many Requests` with retry information

```typescript
// lib/middleware/rate-limit.ts
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute
```

#### Input Validation

All user inputs are validated and sanitized:

```typescript
// lib/middleware/validation.ts
export function validateAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}
```

### Security Headers

Configured in `next.config.js`:

```javascript
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Content-Security-Policy',
    value: 'default-src \'self\'; ...',
  },
  // ... more headers
]
```

### Content Security Policy (CSP)

The CSP restricts resource loading to trusted sources:

- Scripts: Only from self and trusted Solana sources
- Images: Self, data URIs, and known CDNs
- Connect: Only to verified API endpoints
- No `unsafe-inline` for styles (except where necessary)

## Authentication

### Admin Authentication

Admin routes require a bearer token:

```typescript
const authHeader = request.headers.get("authorization");
const adminToken = process.env.ADMIN_TOKEN;

if (adminToken && authHeader !== `Bearer ${adminToken}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Environment Variables

Sensitive values are stored in environment variables:

- `ADMIN_TOKEN` - Admin API authentication
- `CRON_SECRET` - Cron job verification
- `GITHUB_TOKEN` - GitHub API access
- `TWITTER_BEARER_TOKEN` - Twitter API access
- `SOLANA_RPC_URL` - RPC endpoint configuration

## Data Protection

### No Custody

The platform **never** takes custody of user funds:
- Wallet connection is read-only
- Claims go directly to user's wallet
- Fee is deducted atomically via smart contract

### Privacy

- No personal data is collected
- Wallet addresses are public by nature
- No cookies for tracking (only necessary session cookies)
- No analytics that track individual users

### Data Storage

In production with Vercel KV:
- Data is encrypted at rest
- Redis ACLs limit access
- Automatic backup and replication

## Infrastructure Security

### Vercel Platform

- DDoS protection included
- Automatic SSL/TLS
- Edge network with 70+ PoPs
- SOC 2 Type II certified

### Serverless Functions

- Isolated execution environment
- Automatic scaling
- No persistent storage (stateless)
- Timeout limits prevent abuse

### Rate Limiting by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/airdrops | 30/min | 1 minute |
| /api/eligibility/check | 10/min | 1 minute |
| /api/scraper/run | 5/min | 1 minute |
| /api/health | 60/min | 1 minute |

## Vulnerability Prevention

### XSS Prevention

- React automatically escapes content
- CSP restricts script sources
- Input sanitization removes dangerous characters
- No `dangerouslySetInnerHTML` used

### CSRF Prevention

- No sensitive state-changing GET requests
- API uses JSON (not forms)
- SameSite cookie attribute

### Injection Prevention

- No SQL queries (using KV/Redis)
- All inputs validated and sanitized
- No shell command execution

## Monitoring & Incident Response

### Logging

All API errors are logged with:
- Timestamp
- Endpoint
- Error message
- Stack trace (server-side only)

### Alerting

Recommended setup:
- Vercel Analytics for performance
- Sentry for error tracking
- Uptime monitoring (UptimeRobot, Pingdom)

### Incident Response

1. Identify and contain the issue
2. Review logs to understand scope
3. Deploy fix if needed
4. Document and learn

## Compliance

### Legal Considerations

- No financial advice provided
- No custody of funds
- No KYC required
- Users claim directly from sources

### Terms of Service

Recommended additions:
- Disclaimer about airdrop risks
- No guarantee of eligibility
- Users responsible for their claims
- Platform is informational only

## Security Checklist

### Before Deployment

- [ ] Set strong ADMIN_TOKEN
- [ ] Configure all environment variables
- [ ] Enable Vercel KV for production
- [ ] Set up custom domain with SSL
- [ ] Configure rate limits appropriately

### Ongoing

- [ ] Monitor error logs daily
- [ ] Review rate limit hits
- [ ] Update dependencies monthly
- [ ] Audit admin access quarterly
- [ ] Review and update CSP as needed

## Contact

For security issues, contact: [your-email@example.com]

## License

This security documentation is part of the Solana Airdrop Tracker project.
