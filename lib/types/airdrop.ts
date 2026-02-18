// Airdrop types and schema - No mock data, pure types only

export type AirdropCategory = 
  | "DeFi"
  | "NFTs"
  | "Gaming"
  | "Governance"
  | "Bridges"
  | "Testnets"
  | "Social"
  | "Infrastructure"
  | "Liquid Staking"
  | "DEX"
  | "Lending"
  | "Perpetuals"
  | "Oracle"
  | "Wallet"
  | "Gaming";

export type FrictionLevel = "low" | "medium" | "high";
export type ClaimType = "on-chain" | "off-chain" | "mixed";
export type AirdropStatus = "live" | "upcoming" | "ended" | "unverified";

export interface AirdropRule {
  // Required program interactions (Solana program IDs)
  requiredPrograms?: string[];
  // Required token mints held
  requiredTokens?: string[];
  // Minimum token amount
  minTokenAmount?: number;
  // Required NFT collections (collection mint)
  requiredNFTs?: string[];
  // Minimum transaction count with program
  minTransactions?: number;
  // Governance actions (voting, proposals)
  governanceActions?: string[];
  // Bridge usage
  bridgeUsage?: string[];
  // Testnet participation
  testnetParticipation?: boolean;
  // Time-based requirements
  earliestTransaction?: Date;
  latestTransaction?: Date;
  // Minimum volume traded
  minVolumeUSD?: number;
  // Required actions
  requiredActions?: string[];
}

export interface AirdropSource {
  type: "github" | "rss" | "blog" | "twitter" | "discord" | "telegram" | "manual";
  url: string;
  fetchedAt: Date;
  confidence: number;
}

export interface Airdrop {
  id: string;
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter?: string;
  blog?: string;
  discord?: string;
  telegram?: string;
  github?: string;
  
  // Claim details
  claimUrl?: string;
  claimType: ClaimType;
  claimDeadline?: Date;
  claimStartDate?: Date;
  
  // Value estimation
  estimatedValueUSD?: number;
  estimatedValueRange?: { min: number; max: number };
  tokenPrice?: number;
  allocationPerUser?: string;
  
  // Categorization
  categories: AirdropCategory[];
  
  // User experience
  frictionLevel: FrictionLevel;
  
  // Eligibility rules (stored server-side only)
  rules: AirdropRule;
  
  // Metadata
  imageUrl?: string;
  bannerUrl?: string;
  verified: boolean;
  featured: boolean;
  status: AirdropStatus;
  
  // Discovery metadata
  sources: AirdropSource[];
  discoveredAt: Date;
  lastVerifiedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Community metrics
  communityScore?: number;
  upvotes?: number;
  downvotes?: number;
  
  // Additional info
  requirements?: string[];
  notes?: string;
}

export interface WalletActivity {
  address: string;
  // Programs interacted with
  programs: Set<string>;
  // Token mints held
  tokens: Map<string, number>;
  // NFT mints held
  nfts: Set<string>;
  // Governance actions
  governanceActions: Set<string>;
  // Bridge usage
  bridges: Set<string>;
  // Transaction count per program
  transactionCounts: Map<string, number>;
  // First transaction date
  firstTransactionDate?: Date;
  // Last transaction date
  lastTransactionDate?: Date;
  // Total volume traded
  totalVolumeUSD?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  airdropId: string;
  airdropName: string;
  estimatedValue?: number;
  reason?: string;
  missingRequirements?: string[];
  claimUrl?: string;
  frictionLevel: FrictionLevel;
  categories: AirdropCategory[];
  status: AirdropStatus;
}

export interface ScrapedContent {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt?: Date;
  content?: string;
  author?: string;
  imageUrl?: string;
}

export interface DiscoveryResult {
  success: boolean;
  airdrops: Partial<Airdrop>[];
  errors?: string[];
  source: string;
  scrapedAt: Date;
}
