// Enhanced Web Scraper with better discovery algorithms
// Based on research: rate limiting, user-agent rotation, retry logic, better parsing

import { DiscoveryResult } from "@/lib/types/airdrop";

// Expanded target repos with better coverage
const TARGET_REPOS = [
  // Major DeFi protocols
  { owner: "jup-ag", repo: "core", name: "Jupiter", category: "defi" },
  { owner: "jito-foundation", repo: "jito-dapps", name: "Jito", category: "defi" },
  { owner: "pyth-network", repo: "pyth-sdk-solana", name: "Pyth", category: "oracle" },
  { owner: "marginfi", repo: "protocol", name: "MarginFi", category: "lending" },
  { owner: "drift-labs", repo: "protocol-v2", name: "Drift", category: "perpetuals" },
  { owner: "tensor-hq", repo: "tensor-sdk", name: "Tensor", category: "nft" },
  { owner: "sharky-fi", repo: "sharky-protocol", name: "Sharky", category: "nft-lending" },
  { owner: "wormhole-foundation", repo: "wormhole", name: "Wormhole", category: "bridge" },
  { owner: "raydium-io", repo: "raydium-sdk", name: "Raydium", category: "dex" },
  { owner: "orca-so", repo: "whirlpool", name: "Orca", category: "dex" },
  { owner: "meteora-ag", repo: "dlmm-sdk", name: "Meteora", category: "dex" },
  { owner: "Kamino-Finance", repo: "lending", name: "Kamino", category: "lending" },
  { owner: "solendprotocol", repo: "solana-program-library", name: "Solend", category: "lending" },
  { owner: "PhantomApp", repo: "phantom-core", name: "Phantom", category: "wallet" },
  { owner: "HubbleProtocol", repo: "hubble-contracts", name: "Hubble", category: "lending" },
  { owner: "UXDProtocol", repo: "uxd-program", name: "UXD", category: "stablecoin" },
  { owner: "saber-hq", repo: "saber-common", name: "Saber", category: "dex" },
  { owner: "MercurialFinance", repo: "stable-swap", name: "Mercurial", category: "dex" },
  { owner: "Francium-IO", repo: "Francium", name: "Francium", category: "yield" },
  { owner: "Larix-Project", repo: "larix-sdk", name: "Larix", category: "lending" },
  { owner: "port-finance", repo: "port-program", name: "Port Finance", category: "lending" },
  { owner: "Apricot-Finance", repo: "apricot", name: "Apricot", category: "lending" },
  { owner: "parrot-finance", repo: "parrot-sdk", name: "Parrot", category: "liquid-staking" },
  { owner: "synthetify", repo: "synthetify", name: "Synthetify", category: "perpetuals" },
  { owner: "Oxygen-Protocol", repo: "oxygen", name: "Oxygen", category: "defi" },
  { owner: "Bonfida", repo: "bonfida-sdk", name: "Bonfida", category: "infrastructure" },
  { owner: "DialectXYZ", repo: "dialect", name: "Dialect", category: "infrastructure" },
  { owner: "StarAtlasMeta", repo: "star-atlas", name: "Star Atlas", category: "gaming" },
  { owner: "aurory-project", repo: "aurory", name: "Aurory", category: "gaming" },
  { owner: "Genopets", repo: "genopets", name: "Genopets", category: "gaming" },
];

// Enhanced keyword matching with weighted scoring
const KEYWORD_WEIGHTS: Record<string, number> = {
  // High confidence (direct airdrop mentions)
  "airdrop": 1.0,
  "air drop": 1.0,
  "token distribution": 0.95,
  "claim now": 0.95,
  "eligibility check": 0.9,
  "snapshot taken": 0.9,
  "retroactive airdrop": 0.95,
  "token generation event": 0.85,
  "TGE": 0.8,
  
  // Medium confidence (related terms)
  "token launch": 0.7,
  "token claim": 0.8,
  "rewards program": 0.6,
  "points program": 0.5,
  "season rewards": 0.6,
  "community allocation": 0.7,
  "governance token": 0.65,
  "early user rewards": 0.75,
  "loyalty rewards": 0.6,
  
  // Lower confidence (contextual)
  "claim": 0.4,
  "eligibility": 0.5,
  "snapshot": 0.6,
  "rewards": 0.4,
  "retroactive": 0.7,
  "genesis": 0.5,
  "vesting": 0.4,
  "distribution": 0.4,
};

// Negative keywords that reduce confidence
const NEGATIVE_KEYWORDS = [
  "partnership",
  "integration",
  "listing",
  "hackathon",
  "event",
  "conference",
  "AMA",
  "AMA announcement",
  " AMA ",
  "sponsor",
  "collaboration",
  "listing on",
  "exchange listing",
];

// User agents for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  author: { login: string };
}

export interface GitHubIssue {
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  user: { login: string };
}

export async function scrapeGitHub(options?: { limit?: number; githubToken?: string }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 100;
  const githubToken = options?.githubToken;
  
  // Process repos in batches to avoid rate limiting
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < TARGET_REPOS.length; i += batchSize) {
    batches.push(TARGET_REPOS.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (repo) => {
      try {
        // Add random delay between requests (100-500ms)
        await sleep(Math.random() * 400 + 100);
        
        const releases = await fetchRepoReleases(repo.owner, repo.repo, githubToken);
        const repoResults: Partial<Airdrop>[] = [];
        
        for (const release of releases) {
          const analysis = analyzeContentForAirdrop(
            release.name,
            release.body,
            release.html_url,
            repo.name,
            repo.category,
            new Date(release.published_at)
          );
          
          if (analysis && analysis.score >= 0.5) {
            repoResults.push(createAirdropFromRelease(repo, release, analysis));
          }
          
          if (repoResults.length >= Math.ceil(limit / TARGET_REPOS.length)) break;
        }
        
        // Also check issues
        const issues = await fetchRepoIssues(repo.owner, repo.repo, githubToken);
        for (const issue of issues.slice(0, 5)) {
          const analysis = analyzeContentForAirdrop(
            issue.title,
            issue.body,
            issue.html_url,
            repo.name,
            repo.category,
            new Date(issue.created_at)
          );
          
          if (analysis && analysis.score >= 0.6) {
            repoResults.push(createAirdropFromIssue(repo, issue, analysis));
          }
        }
        
        return repoResults;
      } catch (error) {
        errors.push(`${repo.owner}/${repo.repo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return [];
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.flat().forEach(r => results.push(r));
    
    if (results.length >= limit) break;
    
    // Delay between batches
    await sleep(1000);
  }
  
  // Sort by confidence score
  results.sort((a, b) => {
    const scoreA = (a as any).score || 0;
    const scoreB = (b as any).score || 0;
    return scoreB - scoreA;
  });
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "github",
    scrapedAt: new Date(),
  };
}

async function fetchRepoReleases(owner: string, repo: string, token?: string): Promise<GitHubRelease[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=15`;
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  };
  if (token) headers["Authorization"] = `token ${token}`;
  
  const response = await fetchWithRetry(url, { headers });
  if (!response.ok) {
    if (response.status === 403) throw new Error("Rate limited");
    return [];
  }
  return response.json();
}

async function fetchRepoIssues(owner: string, repo: string, token?: string): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=10`;
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  };
  if (token) headers["Authorization"] = `token ${token}`;
  
  const response = await fetchWithRetry(url, { headers });
  if (!response.ok) return [];
  return response.json();
}

function analyzeContentForAirdrop(
  title: string,
  content: string,
  url: string,
  projectName: string,
  category: string,
  publishedAt: Date
): { score: number; keywords: string[]; signals: string[] } | null {
  const text = `${title} ${content}`.toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  // Calculate weighted keyword score
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += weight;
      
      // Track signals
      if (weight >= 0.9) signals.push("high_confidence_keyword");
      if (keyword.includes("claim")) signals.push("claim_available");
      if (keyword.includes("snapshot")) signals.push("snapshot_complete");
    }
  }
  
  // Apply penalties for negative keywords
  for (const negKeyword of NEGATIVE_KEYWORDS) {
    if (text.includes(negKeyword)) {
      score -= 0.15;
    }
  }
  
  // Bonus for multiple keyword matches
  if (foundKeywords.length >= 3) score += 0.3;
  else if (foundKeywords.length >= 2) score += 0.15;
  
  // Recency bonus (more recent = higher priority)
  const daysSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 7) score += 0.25;
  else if (daysSincePublished < 14) score += 0.15;
  else if (daysSincePublished < 30) score += 0.05;
  else if (daysSincePublished > 180) score -= 0.3;
  
  // Category-based adjustments
  const hotCategories = ["defi", "nft", "gaming", "bridge"];
  if (hotCategories.includes(category.toLowerCase())) score += 0.1;
  
  // Normalize score to 0-1 range
  score = Math.min(Math.max(score, 0), 1);
  
  if (foundKeywords.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals };
}

function createAirdropFromRelease(repo: any, release: GitHubRelease, analysis: any): Partial<Airdrop> {
  const categories = categorizeProject(repo.name, repo.category);
  const symbol = deriveSymbol(repo.name);
  
  return {
    name: repo.name,
    symbol,
    description: truncateText(release.body, 500),
    website: release.html_url,
    github: release.html_url,
    categories,
    status: analysis.signals.includes("claim_available") ? "live" : "unverified",
    verified: analysis.score > 0.85,
    featured: analysis.score > 0.8,
    frictionLevel: analysis.signals.includes("claim_available") ? "low" : "medium",
    claimType: "on-chain",
    estimatedValueUSD: estimateValue(repo.category, analysis.score, analysis.signals),
    sources: [{
      type: "github",
      url: release.html_url,
      fetchedAt: new Date(),
      confidence: analysis.score,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    requirements: extractRequirements(release.body),
  };
}

function createAirdropFromIssue(repo: any, issue: GitHubIssue, analysis: any): Partial<Airdrop> {
  const categories = categorizeProject(repo.name, repo.category);
  
  return {
    name: repo.name,
    symbol: deriveSymbol(repo.name),
    description: truncateText(issue.body, 500),
    website: issue.html_url,
    github: issue.html_url,
    categories,
    status: "unverified",
    verified: analysis.score > 0.9,
    featured: analysis.score > 0.85,
    frictionLevel: "medium",
    claimType: "mixed",
    estimatedValueUSD: estimateValue(repo.category, analysis.score, analysis.signals) * 0.7,
    sources: [{
      type: "github",
      url: issue.html_url,
      fetchedAt: new Date(),
      confidence: analysis.score,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function estimateValue(category: string, score: number, signals: string[]): number | undefined {
  const baseValues: Record<string, number> = {
    "defi": 250, "dex": 200, "lending": 180, "perpetuals": 220,
    "nft": 120, "gaming": 100, "bridge": 280, "oracle": 180,
    "wallet": 100, "infrastructure": 150, "liquid-staking": 200,
  };
  
  let value = baseValues[category.toLowerCase()] || 150;
  
  // Adjust by confidence score
  value *= (0.5 + score * 0.5);
  
  // Signal bonuses
  if (signals.includes("snapshot_complete")) value *= 1.5;
  if (signals.includes("claim_available")) value *= 2;
  if (signals.includes("high_confidence_keyword")) value *= 1.3;
  
  return Math.round(value);
}

function extractRequirements(content: string): string[] {
  const requirements: string[] = [];
  const patterns = [
    /must have (?:used|interacted with)/gi,
    /required?:/gi,
    /eligibility:?/gi,
    /prerequisites?:/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      // Extract the requirement text
      const match = content.match(new RegExp(`${pattern.source}\\s*([^.\n]+)`));
      if (match) requirements.push(match[1].trim());
    }
  }
  
  return requirements;
}

function categorizeProject(name: string, category: string): string[] {
  const mapping: Record<string, string[]> = {
    "defi": ["DeFi"], "dex": ["DEX", "DeFi"], "lending": ["Lending", "DeFi"],
    "perpetuals": ["Perpetuals", "DeFi"], "nft": ["NFTs"], "gaming": ["Gaming"],
    "bridge": ["Bridges", "Infrastructure"], "oracle": ["Oracle", "Infrastructure"],
    "wallet": ["Wallet", "Infrastructure"], "infrastructure": ["Infrastructure"],
    "liquid-staking": ["Liquid Staking", "DeFi"], "yield": ["DeFi"],
    "stablecoin": ["DeFi", "Infrastructure"], "nft-lending": ["NFTs", "Lending"],
  };
  return mapping[category.toLowerCase()] || ["DeFi"];
}

function deriveSymbol(name: string): string {
  const symbols: Record<string, string> = {
    "Jupiter": "JUP", "Jito": "JTO", "Pyth": "PYTH", "MarginFi": "MFI",
    "Drift": "DRIFT", "Tensor": "TNSR", "Sharky": "SHARK", "Wormhole": "W",
    "Raydium": "RAY", "Orca": "ORCA", "Meteora": "MET", "Kamino": "KMNO",
    "Solend": "SLND", "Phantom": "PHM", "Saber": "SBR", "Hubble": "HBB",
    "UXD": "UXP", "Star Atlas": "ATLAS", "Aurory": "AURY", "Genopets": "GENE",
  };
  return symbols[name] || name.slice(0, 4).toUpperCase();
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        // Rate limited - wait and retry
        await sleep(1000 * (i + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      await sleep(500 * (i + 1));
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
