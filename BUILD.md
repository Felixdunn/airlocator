# Build Instructions

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Deploy to production:
```bash
vercel --prod
```

## Environment Variables

Set these in Vercel dashboard (Project Settings > Environment Variables):

- `GITHUB_TOKEN` (optional) - GitHub API token for higher rate limits
- `TWITTER_BEARER_TOKEN` (optional) - Twitter API token for Twitter discovery
- `PLATFORM_WALLET` - Solana wallet address for receiving fees
- `PLATFORM_FEE_BPS` - Fee in basis points (default: 200 = 2%)

## Post-Deployment

1. Update sitemap.xml base URL to your production domain
2. Submit sitemap to Google Search Console
3. Configure custom domain in Vercel
4. Set up analytics (optional)

## Smart Contract Deployment (Future)

The fee router contract (`lib/contracts/fee-router-program.rs`) needs to be:

1. Compiled using Solana Tool Suite
2. Deployed to Solana mainnet
3. Program ID updated in `lib/contracts/fee-router.ts`

```bash
# Build the program
cargo build-sbf --manifest-path=programs/fee-router/Cargo.toml

# Deploy to mainnet
solana program deploy target/deploy/fee_router.so
```
