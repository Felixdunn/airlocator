// Multi-chain GitHub Scraper - Supports Ethereum, Solana, and other blockchains

import { DiscoveryResult, Airdrop, Blockchain } from "@/lib/types/airdrop";
import { MULTI_CHAIN_TARGETS, BLOCKCHAIN_CONFIG } from "@/lib/types/airdrop";

const CONFIG = {
  GITHUB_DELAY: 1500,
  BATCH_DELAY: 4000,
  TIMEOUT: 10000,
  MAX_RETRIES: 3,
  BATCH_SIZE: 5,
};

// Combine all targets
const ALL_TARGETS = [
  ...MULTI_CHAIN_TARGETS.ethereum,
  ...MULTI_CHAIN_TARGETS.solana,
  ...MULTI_CHAIN_TARGETS.other,
];

const KEYWORD_WEIGHTS: Record<string, number> = {
  "airdrop": 1.0,
  "token distribution": 0.95,
  "claim now": 0.95,
  "eligibility check": 0.9,
  "snapshot taken": 0.9,
  "retroactive airdrop": 0.95,
  "token generation event": 0.85,
  "TGE": 0.8,
  "token launch": 0.7,
  "token claim": 0.8,
  "rewards program": 0.6,
  "points program": 0.5,
  "season rewards": 0.6,
  "community allocation": 0.7,
  "governance token": 0.65,
  "early user rewards": 0.75,
  "loyalty rewards": 0.6,
  "claim": 0.4,
  "eligibility": 0.5,
  "snapshot": 0.6,
  "rewards": 0.4,
  "retroactive": 0.7,
  "genesis": 0.5,
  "vesting": 0.4,
  "distribution": 0.4,
  "mainnet": 0.3,
  "testnet": 0.2,
  "layer 2": 0.4,
  "restaking": 0.5,
};

const NEGATIVE_KEYWORDS = [
  "partnership", "integration", "listing", "hackathon", "event",
  "conference", "AMA", "sponsor", "collaboration", "exchange listing",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
];

function getRequestHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  };
  if (token) headers["Authorization"] = `token ${token}`;
  return headers;
}

export async function scrapeGitHub(options?: { 
  limit?: number; 
  githubToken?: string;
  chains?: Blockchain[];
  onProgress?: (stage: string, current: number, total: number, currentItem?: string) => void;
}): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 150;
  const githubToken = options?.githubToken;
  const targetChains = options?.chains;
  
  // Filter targets by chain if specified
  let targets = ALL_TARGETS;
  if (targetChains && targetChains.length > 0) {
    targets = ALL_TARGETS.filter(t => targetChains.includes(t.chain));
  }
  
  console.log(`[Multi-Chain Scraper] Starting with ${targets.length} repos`);
  
  const batches = chunkArray(targets, CONFIG.BATCH_SIZE);
  const totalBatches = batches.length;
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = batches[batchIndex];
    const stage = `Batch ${batchIndex + 1}/${totalBatches}`;
    
    if (options?.onProgress) {
      options.onProgress(stage, (batchIndex / totalBatches) * 100, 100);
    }
    
    const batchPromises = batch.map(async (repo) => {
      try {
        await sleep(CONFIG.GITHUB_DELAY + Math.random() * 2000);
        
        if (options?.onProgress) {
          options.onProgress(`Scanning ${repo.name}`, ((batchIndex / totalBatches) * 100), 100, repo.name);
        }
        
        const releases = await fetchRepoReleases(repo.owner, repo.repo, githubToken);
        const repoResults: Partial<Airdrop>[] = [];
        
        for (const release of releases) {
          const analysis = analyzeContentForAirdrop(
            release.name,
            release.body,
            release.html_url,
            repo.name,
            repo.chain,
            new Date(release.published_at)
          );
          
          if (analysis && analysis.score >= 0.5) {
            repoResults.push(createAirdropFromRelease(repo, release, analysis));
          }
        }
        
        // Check issues for announcements
        const issues = await fetchRepoIssues(repo.owner, repo.repo, githubToken);
        for (const issue of issues.slice(0, 5)) {
          const analysis = analyzeContentForAirdrop(
            issue.title,
            issue.body,
            issue.html_url,
            repo.name,
            repo.chain,
            new Date(issue.created_at)
          );
          
          if (analysis && analysis.score >= 0.55) {
            repoResults.push(createAirdropFromIssue(repo, issue, analysis));
          }
        }
        
        return repoResults;
      } catch (error) {
        return [];
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.flat().forEach(r => results.push(r));
    
    if (results.length >= limit) break;
    
    if (batchIndex < totalBatches - 1) {
      await sleep(CONFIG.BATCH_DELAY);
    }
  }
  
  results.sort((a, b) => (b as any).score - (a as any).score);
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "github",
    scrapedAt: new Date(),
  };
}

async function fetchRepoReleases(owner: string, repo: string, token?: string): Promise<any[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=15`;
  return fetchWithRateLimit(url, getRequestHeaders(token));
}

async function fetchRepoIssues(owner: string, repo: string, token?: string): Promise<any[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=10`;
  return fetchWithRateLimit(url, getRequestHeaders(token));
}

async function fetchWithRateLimit(url: string, headers: HeadersInit, retryCount = 0): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(url, { headers, signal: controller.signal, next: { revalidate: 3600 } });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 403) throw new Error("Rate limited");
      if (response.status === 404) return [];
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.GITHUB_DELAY * Math.pow(2, retryCount);
      await sleep(delay);
      return fetchWithRateLimit(url, headers, retryCount + 1);
    }
    throw error;
  }
}

function analyzeContentForAirdrop(
  title: string,
  content: string,
  url: string,
  projectName: string,
  chain: Blockchain,
  publishedAt: Date
): { score: number; keywords: string[]; signals: string[] } | null {
  const text = sanitizeInput(`${title} ${content}`).toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += weight;
      if (weight >= 0.9) signals.push("high_confidence");
      if (keyword.includes("claim")) signals.push("claim_available");
      if (keyword.includes("snapshot")) signals.push("snapshot_complete");
    }
  }
  
  for (const neg of NEGATIVE_KEYWORDS) {
    if (text.includes(neg)) score -= 0.15;
  }
  
  if (foundKeywords.length >= 3) score += 0.3;
  else if (foundKeywords.length >= 2) score += 0.15;
  
  const daysSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 7) score += 0.25;
  else if (daysSincePublished < 14) score += 0.15;
  else if (daysSincePublished < 30) score += 0.05;
  else if (daysSincePublished > 180) score -= 0.3;
  
  // Hot chains bonus
  const hotChains = ["Base", "Arbitrum", "Optimism", "zkSync", "Linea", "Starknet", "Solana"];
  if (hotChains.includes(chain)) score += 0.1;
  
  score = Math.min(Math.max(score, 0), 1);
  if (foundKeywords.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals };
}

function createAirdropFromRelease(repo: any, release: any, analysis: any): Partial<Airdrop> {
  return {
    name: repo.name,
    symbol: deriveSymbol(repo.name),
    description: sanitizeAndTruncate(release.body, 500),
    website: release.html_url,
    github: release.html_url,
    chains: [repo.chain],
    primaryChain: repo.chain,
    categories: categorizeProject(repo.name, repo.chain),
    status: analysis.signals.includes("claim_available") ? "live" : "unverified",
    verified: analysis.score > 0.85,
    featured: analysis.score > 0.8,
    frictionLevel: analysis.signals.includes("claim_available") ? "low" : "medium",
    claimType: "on-chain",
    estimatedValueUSD: estimateValue(repo.chain, analysis.score, analysis.signals),
    sources: [{ type: "github", url: release.html_url, fetchedAt: new Date(), confidence: analysis.score }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createAirdropFromIssue(repo: any, issue: any, analysis: any): Partial<Airdrop> {
  return {
    name: repo.name,
    symbol: deriveSymbol(repo.name),
    description: sanitizeAndTruncate(issue.body, 500),
    website: issue.html_url,
    github: issue.html_url,
    chains: [repo.chain],
    primaryChain: repo.chain,
    categories: categorizeProject(repo.name, repo.chain),
    status: "unverified",
    verified: analysis.score > 0.85,
    featured: analysis.score > 0.8,
    frictionLevel: "medium",
    claimType: "mixed",
    estimatedValueUSD: Math.round(estimateValue(repo.chain, analysis.score, analysis.signals) * 0.7),
    sources: [{ type: "github", url: issue.html_url, fetchedAt: new Date(), confidence: analysis.score }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Utilities
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim();
}

function sanitizeAndTruncate(text: string, maxLength: number): string {
  const s = sanitizeInput(text);
  return s.length <= maxLength ? s : s.slice(0, maxLength).trim() + "...";
}

function estimateValue(chain: Blockchain, score: number, signals: string[]): number | undefined {
  const baseValues: Record<Blockchain, number> = {
    "Solana": 200, "Ethereum": 350, "Base": 250, "Arbitrum": 280,
    "Optimism": 280, "Polygon": 150, "Avalanche": 180, "BSC": 120,
    "Sui": 180, "Aptos": 180, "Cosmos": 150, "Polkadot": 150,
    "Starknet": 220, "zkSync": 240, "Linea": 200, "Scroll": 180,
  };
  let value = baseValues[chain] || 150;
  value *= (0.5 + score * 0.5);
  if (signals.includes("snapshot_complete")) value *= 1.5;
  if (signals.includes("claim_available")) value *= 2;
  return Math.round(value);
}

function categorizeProject(name: string, chain: Blockchain): AirdropCategory[] {
  if (["Optimism", "Arbitrum", "Base", "zkSync", "Linea", "Scroll", "Starknet"].includes(chain)) {
    return ["Layer 2", "Infrastructure"];
  }
  return ["DeFi", "Infrastructure"];
}

function deriveSymbol(name: string): string {
  const symbols: Record<string, string> = {
    "Jupiter": "JUP", "Jito": "JTO", "Pyth": "PYTH", "Tensor": "TNSR",
    "Drift": "DRIFT", "MarginFi": "MFI", "Optimism": "OP", "Arbitrum": "ARB",
    "Base": "BASE", "zkSync": "ZK", "Linea": "LINEA", "Scroll": "SCR",
    "Starknet": "STRK", "Sui": "SUI", "Aptos": "APT", "Cosmos": "ATOM",
    "Polkadot": "DOT",
  };
  return symbols[name] || name.slice(0, 4).toUpperCase();
}

type AirdropCategory = any;
