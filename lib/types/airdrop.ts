// Multi-chain Airdrop Types - Supports Solana, Ethereum, and other blockchains

export type Blockchain = 
  | "Solana"
  | "Ethereum"
  | "Base"
  | "Arbitrum"
  | "Optimism"
  | "Polygon"
  | "Avalanche"
  | "BSC"
  | "Sui"
  | "Aptos"
  | "Cosmos"
  | "Polkadot"
  | "Starknet"
  | "zkSync"
  | "Linea"
  | "Scroll";

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
  | "Gaming"
  | "Layer 2"
  | "Restaking";

export type FrictionLevel = "low" | "medium" | "high";
export type ClaimType = "on-chain" | "off-chain" | "mixed";
export type AirdropStatus = "live" | "upcoming" | "ended" | "unverified";

export interface AirdropRule {
  requiredPrograms?: string[];
  requiredContracts?: string[];
  requiredTokens?: string[];
  minTokenAmount?: number;
  requiredNFTs?: string[];
  minTransactions?: number;
  governanceActions?: string[];
  bridgeUsage?: string[];
  testnetParticipation?: boolean;
  earliestTransaction?: Date;
  latestTransaction?: Date;
  minVolumeUSD?: number;
  requiredActions?: string[];
  chain?: Blockchain;
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
  
  // Blockchain info
  chains: Blockchain[];
  primaryChain: Blockchain;
  
  // Categorization
  categories: AirdropCategory[];
  
  // User experience
  frictionLevel: FrictionLevel;
  
  // Eligibility rules
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
  programs: Set<string>;
  tokens: Map<string, number>;
  nfts: Set<string>;
  governanceActions: Set<string>;
  bridges: Set<string>;
  transactionCounts: Map<string, number>;
  firstTransactionDate?: Date;
  lastTransactionDate?: Date;
  totalVolumeUSD?: number;
  chains?: Blockchain[];
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
  chain?: Blockchain;
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

// Blockchain-specific configurations
export const BLOCKCHAIN_CONFIG: Record<Blockchain, { name: string; rpc?: string; explorer: string; color: string }> = {
  "Solana": { name: "Solana", explorer: "https://solscan.io", color: "#9945FF" },
  "Ethereum": { name: "Ethereum", explorer: "https://etherscan.io", color: "#627EEA" },
  "Base": { name: "Base", explorer: "https://basescan.org", color: "#0052FF" },
  "Arbitrum": { name: "Arbitrum", explorer: "https://arbiscan.io", color: "#28A0F0" },
  "Optimism": { name: "Optimism", explorer: "https://optimistic.etherscan.io", color: "#FF0420" },
  "Polygon": { name: "Polygon", explorer: "https://polygonscan.com", color: "#8247E5" },
  "Avalanche": { name: "Avalanche", explorer: "https://snowtrace.io", color: "#E84142" },
  "BSC": { name: "BNB Chain", explorer: "https://bscscan.com", color: "#F0B90B" },
  "Sui": { name: "Sui", explorer: "https://suiscan.xyz", color: "#4DA2FF" },
  "Aptos": { name: "Aptos", explorer: "https://aptoscan.com", color: "#3D64E3" },
  "Cosmos": { name: "Cosmos", explorer: "https://mintscan.io", color: "#2E3148" },
  "Polkadot": { name: "Polkadot", explorer: "https://polkascan.io", color: "#E6007A" },
  "Starknet": { name: "Starknet", explorer: "https://starkscan.co", color: "#ECB823" },
  "zkSync": { name: "zkSync", explorer: "https://explorer.zksync.io", color: "#4C5291" },
  "Linea": { name: "Linea", explorer: "https://lineascan.build", color: "#121212" },
  "Scroll": { name: "Scroll", explorer: "https://scrollscan.com", color: "#FFD200" },
};

// Multi-chain target projects for scraping
export const MULTI_CHAIN_TARGETS = {
  // Ethereum L2s
  ethereum: [
    { owner: "ethereum-optimism", repo: "optimism", name: "Optimism", chain: "Optimism" as Blockchain },
    { owner: "OffchainLabs", repo: "arbitrum", name: "Arbitrum", chain: "Arbitrum" as Blockchain },
    { owner: "base-org", repo: "base", name: "Base", chain: "Base" as Blockchain },
    { owner: "matter-labs", repo: "zksync", name: "zkSync", chain: "zkSync" as Blockchain },
    { owner: "Consensys", repo: "linea", name: "Linea", chain: "Linea" as Blockchain },
    { owner: "scroll-tech", repo: "scroll", name: "Scroll", chain: "Scroll" as Blockchain },
    { owner: "latticexyz", repo: "mud", name: "Mud/Redstone", chain: "Optimism" as Blockchain },
  ],
  // Solana ecosystem
  solana: [
    { owner: "jup-ag", repo: "core", name: "Jupiter", chain: "Solana" as Blockchain },
    { owner: "jito-foundation", repo: "jito-dapps", name: "Jito", chain: "Solana" as Blockchain },
    { owner: "pyth-network", repo: "pyth-sdk-solana", name: "Pyth", chain: "Solana" as Blockchain },
    { owner: "tensor-hq", repo: "tensor-sdk", name: "Tensor", chain: "Solana" as Blockchain },
    { owner: "drift-labs", repo: "protocol-v2", name: "Drift", chain: "Solana" as Blockchain },
    { owner: "marginfi", repo: "protocol", name: "MarginFi", chain: "Solana" as Blockchain },
  ],
  // Other chains
  other: [
    { owner: "MystenLabs", repo: "sui", name: "Sui", chain: "Sui" as Blockchain },
    { owner: "aptos-labs", repo: "aptos-core", name: "Aptos", chain: "Aptos" as Blockchain },
    { owner: "cosmos", repo: "cosmos-sdk", name: "Cosmos", chain: "Cosmos" as Blockchain },
    { owner: "paritytech", repo: "polkadot", name: "Polkadot", chain: "Polkadot" as Blockchain },
    { owner: "starkware-libs", repo: "cairo", name: "Starknet", chain: "Starknet" as Blockchain },
  ],
};
