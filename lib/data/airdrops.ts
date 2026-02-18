import { Airdrop, AirdropCategory } from "@/lib/types/airdrop";

// Sample airdrops data - In production, this would be populated by the discovery engine
export const airdrops: Airdrop[] = [
  {
    id: "jito",
    name: "Jito",
    symbol: "JTO",
    description: "Jito is a liquid staking protocol on Solana that provides MEV rewards to stakers. Claim your JTO tokens for participating in the ecosystem.",
    website: "https://jito.network",
    twitter: "https://twitter.com/jito_sol",
    blog: "https://blog.jito.network",
    claimUrl: "https://airdrop.jito.network",
    claimType: "on-chain",
    estimatedValueUSD: 150,
    categories: ["DeFi", "Infrastructure"],
    frictionLevel: "low",
    rules: {
      requiredPrograms: [
        "Jito4E1FxqhR6FkU4VyXGj9kZy9rWnHzNDR5mVYzQsT",
      ],
      minTransactions: 1,
      earliestTransaction: new Date("2023-01-01"),
    },
    imageUrl: "https://raw.githubusercontent.com/jito-foundation/jito-dapps/main/public/logo.png",
    verified: true,
    featured: true,
    live: true,
    createdAt: new Date("2023-12-07"),
    updatedAt: new Date("2024-01-15"),
    source: {
      type: "github",
      url: "https://github.com/jito-foundation",
    },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    symbol: "JUP",
    description: "Jupiter is the key liquidity aggregator for Solana, supporting all tokens and providing the best swap rates. Claim JUP for your ecosystem participation.",
    website: "https://jup.ag",
    twitter: "https://twitter.com/JupiterExchange",
    blog: "https://blog.jup.ag",
    claimUrl: "https://claim.jup.ag",
    claimType: "on-chain",
    estimatedValueUSD: 500,
    categories: ["DeFi"],
    frictionLevel: "low",
    rules: {
      requiredPrograms: [
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      ],
      minTransactions: 3,
      earliestTransaction: new Date("2023-01-01"),
      latestTransaction: new Date("2024-01-31"),
    },
    imageUrl: "https://static.jup.ag/jup/icon.png",
    verified: true,
    featured: true,
    live: true,
    createdAt: new Date("2024-01-31"),
    updatedAt: new Date("2024-02-15"),
    source: {
      type: "twitter",
      url: "https://twitter.com/JupiterExchange",
    },
  },
  {
    id: "pyth",
    name: "Pyth Network",
    symbol: "PYTH",
    description: "Pyth Network is a decentralized oracle network delivering real-time market data. Claim PYTH for using Pyth-fed protocols.",
    website: "https://pyth.network",
    twitter: "https://twitter.com/PythNetwork",
    blog: "https://pyth.network/blog",
    claimUrl: "https://pyth.network/claim",
    claimType: "on-chain",
    estimatedValueUSD: 200,
    categories: ["DeFi", "Infrastructure"],
    frictionLevel: "low",
    rules: {
      requiredPrograms: [
        "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH",
      ],
      minTransactions: 1,
    },
    imageUrl: "https://pyth.network/pyth-logo.png",
    verified: true,
    featured: true,
    live: true,
    createdAt: new Date("2023-11-20"),
    updatedAt: new Date("2024-01-10"),
    source: {
      type: "blog",
      url: "https://pyth.network/blog/airdrop",
    },
  },
  {
    id: "marginfi",
    name: "MarginFi",
    symbol: "MFI",
    description: "MarginFi is a decentralized lending protocol on Solana. Earn MFI tokens for providing liquidity and borrowing.",
    website: "https://marginfi.com",
    twitter: "https://twitter.com/marginfi",
    claimUrl: "https://app.marginfi.com/claim",
    claimType: "on-chain",
    estimatedValueRange: { min: 50, max: 500 },
    categories: ["DeFi"],
    frictionLevel: "medium",
    rules: {
      requiredPrograms: [
        "marBjsLQjFHMz4BkGfZvqTJZvJhZ1",
      ],
      minTransactions: 5,
      earliestTransaction: new Date("2023-03-01"),
    },
    verified: true,
    featured: false,
    live: true,
    createdAt: new Date("2023-09-15"),
    updatedAt: new Date("2024-02-01"),
    source: {
      type: "twitter",
      url: "https://twitter.com/marginfi",
    },
  },
  {
    id: "drift",
    name: "Drift Protocol",
    symbol: "DRIFT",
    description: "Drift is a decentralized perpetual futures exchange on Solana. Claim DRIFT for trading activity.",
    website: "https://drift.trade",
    twitter: "https://twitter.com/DriftProtocol",
    claimUrl: "https://app.drift.trade/airdrop",
    claimType: "on-chain",
    estimatedValueRange: { min: 100, max: 1000 },
    categories: ["DeFi"],
    frictionLevel: "medium",
    rules: {
      requiredPrograms: [
        "dRIFT5XGhJN9K1RvNqJz8V1",
      ],
      minTransactions: 10,
      earliestTransaction: new Date("2023-06-01"),
    },
    verified: true,
    featured: false,
    live: true,
    createdAt: new Date("2023-10-01"),
    updatedAt: new Date("2024-01-20"),
    source: {
      type: "blog",
      url: "https://drift.trade/blog",
    },
  },
  {
    id: "tensor",
    name: "Tensor",
    symbol: "TNSR",
    description: "Tensor is the leading NFT marketplace on Solana. Claim TNSR for NFT trading activity.",
    website: "https://tensor.trade",
    twitter: "https://twitter.com/TensorTrade",
    claimUrl: "https://app.tensor.trade/claim",
    claimType: "on-chain",
    estimatedValueRange: { min: 50, max: 300 },
    categories: ["NFTs"],
    frictionLevel: "low",
    rules: {
      requiredPrograms: [
        "TSWAPcL9Ly28vwZJ",
      ],
      minTransactions: 5,
      earliestTransaction: new Date("2023-01-01"),
    },
    verified: true,
    featured: true,
    live: true,
    createdAt: new Date("2024-04-01"),
    updatedAt: new Date("2024-04-15"),
    source: {
      type: "twitter",
      url: "https://twitter.com/TensorTrade",
    },
  },
  {
    id: "sharky",
    name: "Sharky",
    symbol: "SHARK",
    description: "Sharky is an NFT lending protocol on Solana. Claim SHARK for providing liquidity or borrowing against NFTs.",
    website: "https://sharky.fi",
    twitter: "https://twitter.com/SharkyFi",
    claimUrl: "https://app.sharky.fi/claim",
    claimType: "on-chain",
    estimatedValueRange: { min: 20, max: 150 },
    categories: ["DeFi", "NFTs"],
    frictionLevel: "medium",
    rules: {
      requiredPrograms: [
        "SHARKobtfF1bHhxDZimZjQ",
      ],
      minTransactions: 3,
    },
    verified: true,
    featured: false,
    live: true,
    createdAt: new Date("2023-08-01"),
    updatedAt: new Date("2024-01-05"),
    source: {
      type: "github",
      url: "https://github.com/sharky-fi",
    },
  },
  {
    id: "wormhole",
    name: "Wormhole",
    symbol: "W",
    description: "Wormhole is a cross-chain bridge protocol connecting multiple blockchains. Claim W for bridge usage.",
    website: "https://wormhole.com",
    twitter: "https://twitter.com/wormhole",
    blog: "https://wormhole.com/blog",
    claimUrl: "https://claim.wormhole.com",
    claimType: "on-chain",
    estimatedValueUSD: 300,
    categories: ["Bridges", "Infrastructure"],
    frictionLevel: "low",
    rules: {
      requiredPrograms: [
        "wormDTUJ6RCPNLsX1DYvM",
      ],
      minTransactions: 1,
      bridgeUsage: ["wormhole"],
    },
    verified: true,
    featured: true,
    live: true,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-03-01"),
    source: {
      type: "blog",
      url: "https://wormhole.com/blog/airdrop",
    },
  },
  {
    id: "degen",
    name: "Degen",
    symbol: "DEGEN",
    description: "Degen is a social token on Farcaster. Claim DEGEN for social media activity and engagement.",
    website: "https://degen.town",
    twitter: "https://twitter.com/degentoken",
    claimType: "off-chain",
    estimatedValueRange: { min: 10, max: 100 },
    categories: ["Social"],
    frictionLevel: "high",
    rules: {
      requiredPrograms: [],
      testnetParticipation: false,
    },
    verified: false,
    featured: false,
    live: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-02-01"),
    source: {
      type: "twitter",
      url: "https://twitter.com/degentoken",
    },
  },
  {
    id: "star-atlas",
    name: "Star Atlas",
    symbol: "ATLAS",
    description: "Star Atlas is a blockchain-based space exploration game. Claim ATLAS for gameplay and participation.",
    website: "https://staratlas.com",
    twitter: "https://twitter.com/staratlas",
    claimType: "on-chain",
    estimatedValueRange: { min: 30, max: 200 },
    categories: ["Gaming", "NFTs"],
    frictionLevel: "medium",
    rules: {
      requiredPrograms: [
        "ATLAS7kUqNzjN1",
      ],
      minTransactions: 5,
      requiredNFTs: ["star-atlas-ship"],
    },
    verified: true,
    featured: false,
    live: true,
    createdAt: new Date("2023-07-01"),
    updatedAt: new Date("2024-01-15"),
    source: {
      type: "github",
      url: "https://github.com/staratlasmeta",
    },
  },
  {
    id: "testnet-rewards",
    name: "Solana Testnet Rewards",
    symbol: "SOL",
    description: "Participate in Solana testnet programs and earn SOL rewards for helping test new features.",
    website: "https://solana.com",
    twitter: "https://twitter.com/solana",
    claimType: "off-chain",
    estimatedValueRange: { min: 5, max: 50 },
    categories: ["Testnets", "Infrastructure"],
    frictionLevel: "high",
    rules: {
      testnetParticipation: true,
      minTransactions: 10,
    },
    verified: true,
    featured: false,
    live: true,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2024-02-01"),
    source: {
      type: "github",
      url: "https://github.com/solana-labs",
    },
  },
  {
    id: "realm",
    name: "Realm",
    symbol: "RLM",
    description: "Realm is a DAO governance platform on Solana. Claim RLM for participating in DAO governance.",
    website: "https://realm.so",
    twitter: "https://twitter.com/realm_dao",
    claimType: "on-chain",
    estimatedValueRange: { min: 20, max: 100 },
    categories: ["Governance", "Infrastructure"],
    frictionLevel: "medium",
    rules: {
      governanceActions: ["vote", "propose"],
      minTransactions: 3,
    },
    verified: true,
    featured: false,
    live: true,
    createdAt: new Date("2023-05-01"),
    updatedAt: new Date("2024-01-10"),
    source: {
      type: "blog",
      url: "https://realm.so/blog",
    },
  },
];

export const CATEGORIES: AirdropCategory[] = [
  "DeFi",
  "NFTs",
  "Gaming",
  "Governance",
  "Bridges",
  "Testnets",
  "Social",
  "Infrastructure",
];

export function getAirdropById(id: string): Airdrop | undefined {
  return airdrops.find(a => a.id === id);
}

export function getLiveAirdrops(): Airdrop[] {
  return airdrops.filter(a => a.live);
}

export function getFeaturedAirdrops(): Airdrop[] {
  return airdrops.filter(a => a.featured && a.live);
}

export function getAirdropsByCategory(category: AirdropCategory): Airdrop[] {
  return airdrops.filter(a => a.categories.includes(category) && a.live);
}

export function getCategoryCounts(): Map<AirdropCategory, number> {
  const counts = new Map<AirdropCategory, number>();
  CATEGORIES.forEach(cat => counts.set(cat, 0));
  
  airdrops.forEach(airdrop => {
    if (airdrop.live) {
      airdrop.categories.forEach(cat => {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      });
    }
  });
  
  return counts;
}
