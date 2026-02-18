# Production Deployment Guide

## Vercel Deployment

### 1. Push to GitHub

Your code is already pushed to: https://github.com/Felixdunn/airlocator

### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure the following settings:

**Build Settings:**
- Framework Preset: Next.js
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `.next`

**Environment Variables:**
Add these in Vercel dashboard (Project Settings > Environment Variables):

```bash
# Required
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_FEE_BPS=200

# Optional - for enhanced discovery
GITHUB_TOKEN=your_github_token
TWITTER_BEARER_TOKEN=your_twitter_token

# Optional - for admin protection
ADMIN_TOKEN=your_secure_random_token
CRON_SECRET=your_secure_random_token

# Optional - Vercel KV (for production storage)
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_vercel_kv_rest_url
KV_REST_API_TOKEN=your_vercel_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_readonly_token
```

### 3. Enable Vercel Cron

The `vercel.json` file configures automatic scraping every 6 hours:

```json
{
  "crons": [
    {
      "path": "/api/scraper/cron",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 4. Deploy

Click "Deploy" and your app will be live!

## Post-Deployment

### 1. Run Initial Scraper

After deployment, manually trigger the first scrape:

```bash
curl -X POST https://your-app.vercel.app/api/scraper/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Access Admin Dashboard

Visit: `https://your-app.vercel.app/admin`

Use the admin dashboard to:
- View discovered airdrops
- Verify/unverify airdrops
- Feature important airdrops
- Manually trigger scrapes
- View scraper status

### 3. Set Up Vercel KV (Recommended)

For production storage, enable Vercel KV:

1. Go to Vercel Dashboard > Storage > Connect Database
2. Select "Vercel KV"
3. Connect to your project
4. Environment variables will be auto-configured

Then update `lib/data/airdrop-store.ts` to use KV instead of in-memory storage.

## Security Features

### Implemented:
- ✅ Rate limiting on all API routes
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Input validation and sanitization
- ✅ Admin authentication for sensitive routes
- ✅ Server-side only eligibility logic
- ✅ No exposure of scraping rules to clients

### Recommended Additional Steps:
1. Enable Vercel Analytics for monitoring
2. Set up Vercel Functions timeout to 60s for scrapers
3. Configure custom domain with SSL
4. Set up error monitoring (Sentry, etc.)

## Cost Estimate

**Vercel Free Tier:**
- 100GB bandwidth/month
- 100GB serverless function execution
- Unlimited static pages
- Cron jobs included

**Expected Usage:**
- Scraper runs 4x/day (every 6 hours)
- Each scrape: ~30 seconds execution
- Total: ~2 minutes/day = ~1 hour/month
- Well within free tier limits!

## Monitoring

Check scraper health:
```bash
curl https://your-app.vercel.app/api/scraper/status
```

Check airdrops:
```bash
curl https://your-app.vercel.app/api/airdrops
```

Health check:
```bash
curl https://your-app.vercel.app/api/health
```
