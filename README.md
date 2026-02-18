# Solana Airdrop Tracker

A non-custodial platform that discovers Solana airdrops and helps users claim them with a small performance fee.

## Features

- 🔍 **Airdrop Discovery**: Automatically sources airdrops from GitHub, RSS feeds, and Twitter
- 📊 **Category System**: Filter airdrops by DeFi, NFTs, Gaming, Governance, Bridges, Testnets, Social, and Infrastructure
- 💼 **Wallet Scanner**: Check your Solana wallet for eligibility across all live airdrops
- 🎯 **Eligibility Checker**: Rules-based engine matches wallet activity against airdrop requirements
- 💰 **Fee Router**: 2% fee only on successful claims - no claim, no fee
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔒 **Non-Custodial**: Never takes custody of user funds

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Web3**: @solana/web3.js, @solana/wallet-adapter
- **Animations**: Framer Motion
- **Deployment**: Vercel (serverless functions)
- **On-Chain**: Minimal Solana program for fee routing

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Solana wallet (Phantom, Solflare)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/solana-airdrop-tracker.git
cd solana-airdrop-tracker

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Create a `.env.local` file:

```bash
# GitHub API (optional, for higher rate limits)
GITHUB_TOKEN=your_github_token

# Twitter API (optional, for Twitter discovery)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Platform fee wallet (for production)
PLATFORM_WALLET=your_platform_wallet_address
```

## Project Structure

```
solana-airdrop-tracker/
├── app/
│   ├── api/              # Vercel serverless functions
│   │   └── discovery/    # Airdrop discovery APIs
│   ├── airdrop/[id]/     # Individual airdrop pages
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── airdrop/          # Airdrop-related components
│   ├── layout/           # Layout components
│   └── providers/        # Context providers
├── lib/
│   ├── contracts/        # Smart contract code
│   ├── data/             # Airdrop data
│   ├── types/            # TypeScript types
│   ├── eligibility-checker.ts
│   ├── wallet-scanner.ts
│   └── utils.ts
└── public/
    ├── robots.txt
    └── sitemap.xml
```

## API Routes

### Discovery APIs

- `GET /api/discovery/github` - Fetch airdrop announcements from GitHub
- `GET /api/discovery/rss` - Fetch from RSS feeds
- `GET /api/discovery/twitter` - Fetch from Twitter/X
- `POST /api/discovery/classifier` - AI-powered airdrop classification

## Business Model

- **Revenue**: 2% fee on successful airdrop claims
- **No Subscriptions**: Free to use
- **No Custody**: Funds go directly to users
- **Zero-Cost Infra**: Vercel free tier, public RPC

## Legal

This platform:
- ❌ Never custodies user funds
- ❌ Does not provide investment advice
- ❌ Does not pool assets
- ❌ Does not require KYC
- ✅ Only charges fees on successful claims

## License

MIT
