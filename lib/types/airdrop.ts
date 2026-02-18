// Airdrop types and schema

export type AirdropCategory = 
  | "DeFi"
  | "NFTs"
  | "Gaming"
  | "Governance"
  | "Bridges"
  | "Testnets"
  | "Social"
  | "Infrastructure";

export type FrictionLevel = "low" | "medium" | "high";
export type ClaimType = "on-chain" | "off-chain" | "mixed";

export interface AirdropRule {
  // Required program interactions
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
}

export interface Airdrop {
  id: string;
  name: string;
  description: string;
  symbol: string;
  website: string;
  twitter?: string;
  blog?: string;
  github?: string;
  
  // Claim details
  claimUrl?: string;
  claimType: ClaimType;
  claimDeadline?: Date;
  
  // Value estimation
  estimatedValueUSD?: number;
  estimatedValueRange?: { min: number; max: number };
  
  // Categorization
  categories: AirdropCategory[];
  
  // User experience
  frictionLevel: FrictionLevel;
  
  // Eligibility rules
  rules: AirdropRule;
  
  // Metadata
  imageUrl?: string;
  verified: boolean;
  featured: boolean;
  live: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Source information
  source: {
    type: "github" | "rss" | "blog" | "twitter" | "community";
    url: string;
  };
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
}
