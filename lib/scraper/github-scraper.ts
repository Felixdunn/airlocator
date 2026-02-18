// Enhanced Web Scraper - Security-hardened with best practices from 2025 guidelines
// Implements: rate limiting, user-agent rotation, ethical scraping, input validation

import { DiscoveryResult, Airdrop } from "@/lib/types/airdrop";

// Configuration with rate limiting constants
const CONFIG = {
  // Rate limiting (ms)
  GITHUB_DELAY: 2000, // 2 seconds between requests (conservative start)
  BATCH_DELAY: 5000,  // 5 seconds between batches
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 2000,
  
  // Concurrency
  BATCH_SIZE: 5,
  
  // Request timeouts
  TIMEOUT: 10000, // 10 seconds
  
  // Rate limit headers to monitor
  RATE_LIMIT_HEADERS: {
    limit: 'x-ratelimit-limit',
    remaining: 'x-ratelimit-remaining',
    reset: 'x-ratelimit-reset',
  },
};

// Target repos (public data only - ethical scraping)
const TARGET_REPOS = [
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
  { owner: "StarAtlasMeta", repo: "star-atlas", name: "Star Atlas", category: "gaming" },
];

// Weighted keyword scoring
const KEYWORD_WEIGHTS: Record<string, number> = {
  "airdrop": 1.0,
  "air drop": 1.0,
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
  "claim": 0.4,
  "eligibility": 0.5,
  "snapshot": 0.6,
  "rewards": 0.4,
  "retroactive": 0.7,
  "genesis": 0.5,
  "vesting": 0.4,
  "distribution": 0.4,
};

// Negative keywords (reduce false positives)
const NEGATIVE_KEYWORDS = [
  "partnership", "integration", "listing", "hackathon", "event",
  "conference", "AMA", "sponsor", "collaboration", "exchange listing",
];

// User agent rotation (real browser signatures)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
];

// Custom headers to mimic legitimate browser requests
function getRequestHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
  };
  
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  
  return headers;
}

export async function scrapeGitHub(options?: { limit?: number; githubToken?: string }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 100;
  const githubToken = options?.githubToken;
  
  console.log(`[GitHub Scraper] Starting with ${TARGET_REPOS.length} repos, limit: ${limit}`);
  
  // Process repos in batches to avoid rate limiting
  const batches = chunkArray(TARGET_REPOS, CONFIG.BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`[GitHub Scraper] Processing batch ${batchIndex + 1}/${batches.length}`);
    
    const batchPromises = batch.map(async (repo) => {
      try {
        // Random delay between requests (2-5 seconds)
        const delay = CONFIG.GITHUB_DELAY + Math.random() * 3000;
        await sleep(delay);
        
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
        }
        
        // Check issues (lower threshold for issues)
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
        const errorMsg = `${repo.owner}/${repo.repo}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[GitHub Scraper] ${errorMsg}`);
        return [];
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.flat().forEach(r => results.push(r));
    
    if (results.length >= limit) break;
    
    // Delay between batches (5 seconds)
    if (batchIndex < batches.length - 1) {
      await sleep(CONFIG.BATCH_DELAY);
    }
  }
  
  // Sort by confidence score (highest first)
  results.sort((a, b) => (b as any).score - (a as any).score);
  
  console.log(`[GitHub Scraper] Complete: ${results.length} airdrops found`);
  
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

// Enhanced fetch with rate limit handling and exponential backoff
async function fetchWithRateLimit(url: string, headers: HeadersInit, retryCount = 0): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    
    clearTimeout(timeoutId);
    
    // Check rate limit headers
    const remaining = response.headers.get(CONFIG.RATE_LIMIT_HEADERS.remaining);
    const resetTime = response.headers.get(CONFIG.RATE_LIMIT_HEADERS.reset);
    
    if (remaining && parseInt(remaining) < 10) {
      console.warn(`[GitHub Scraper] Rate limit low: ${remaining} remaining`);
      if (resetTime) {
        const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000;
        if (waitTime > 0) {
          console.log(`[GitHub Scraper] Waiting ${waitTime}ms for rate limit reset`);
          await sleep(Math.min(waitTime, 60000)); // Max 1 minute wait
        }
      }
    }
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("Rate limited (403)");
      }
      if (response.status === 404) {
        return []; // Repo not found or private
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    // Exponential backoff for retries
    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.RETRY_BASE_DELAY * Math.pow(2, retryCount);
      console.log(`[GitHub Scraper] Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} after ${delay}ms`);
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
  category: string,
  publishedAt: Date
): { score: number; keywords: string[]; signals: string[] } | null {
  // Sanitize input (prevent injection attacks)
  const text = sanitizeInput(`${title} ${content}`).toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  // Calculate weighted keyword score
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += weight;
      
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
  
  // Recency bonus
  const daysSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 7) score += 0.25;
  else if (daysSincePublished < 14) score += 0.15;
  else if (daysSincePublished < 30) score += 0.05;
  else if (daysSincePublished > 180) score -= 0.3;
  
  // Category bonus
  const hotCategories = ["defi", "nft", "gaming", "bridge"];
  if (hotCategories.includes(category.toLowerCase())) score += 0.1;
  
  // Normalize to 0-1 range
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
    categories: categorizeProject(repo.name, repo.category),
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

function createAirdropFromIssue(repo: any, issue: any, analysis: any): Partial<Airdrop> {
  return {
    name: repo.name,
    symbol: deriveSymbol(repo.name),
    description: sanitizeAndTruncate(issue.body, 500),
    website: issue.html_url,
    github: issue.html_url,
    categories: categorizeProject(repo.name, repo.category),
    status: "unverified",
    verified: analysis.score > 0.9,
    featured: analysis.score > 0.85,
    frictionLevel: "medium",
    claimType: "mixed",
    estimatedValueUSD: Math.round(estimateValue(repo.category, analysis.score, analysis.signals) * 0.7),
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

// Utility functions
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

// Security: Sanitize user-generated content
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/&#\d+;/g, '') // Remove HTML entities
    .trim();
}

function sanitizeAndTruncate(text: string, maxLength: number): string {
  const sanitized = sanitizeInput(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.slice(0, maxLength).trim() + "...";
}

function estimateValue(category: string, score: number, signals: string[]): number | undefined {
  const baseValues: Record<string, number> = {
    "defi": 250, "dex": 200, "lending": 180, "perpetuals": 220,
    "nft": 120, "gaming": 100, "bridge": 280, "oracle": 180,
    "wallet": 100, "infrastructure": 150, "liquid-staking": 200,
  };
  
  let value = baseValues[category.toLowerCase()] || 150;
  value *= (0.5 + score * 0.5);
  
  if (signals.includes("snapshot_complete")) value *= 1.5;
  if (signals.includes("claim_available")) value *= 2;
  if (signals.includes("high_confidence_keyword")) value *= 1.3;
  
  return Math.round(value);
}

function extractRequirements(content: string): string[] {
  const requirements: string[] = [];
  const sanitized = sanitizeInput(content);
  
  const patterns = [
    /must have (?:used|interacted with)/gi,
    /required?:/gi,
    /eligibility:?/gi,
    /prerequisites?:/gi,
  ];
  
  for (const pattern of patterns) {
    const match = sanitized.match(new RegExp(`${pattern.source}\\s*([^.\n]+)`));
    if (match) requirements.push(match[1].trim());
  }
  
  return requirements;
}

function categorizeProject(name: string, category: string): string[] {
  const mapping: Record<string, string[]> = {
    "defi": ["DeFi"], "dex": ["DEX", "DeFi"], "lending": ["Lending", "DeFi"],
    "perpetuals": ["Perpetuals", "DeFi"], "nft": ["NFTs"], "gaming": ["Gaming"],
    "bridge": ["Bridges", "Infrastructure"], "oracle": ["Oracle", "Infrastructure"],
    "wallet": ["Wallet", "Infrastructure"], "infrastructure": ["Infrastructure"],
    "liquid-staking": ["Liquid Staking", "DeFi"],
  };
  return mapping[category.toLowerCase()] || ["DeFi"];
}

function deriveSymbol(name: string): string {
  const symbols: Record<string, string> = {
    "Jupiter": "JUP", "Jito": "JTO", "Pyth": "PYTH", "MarginFi": "MFI",
    "Drift": "DRIFT", "Tensor": "TNSR", "Sharky": "SHARK", "Wormhole": "W",
    "Raydium": "RAY", "Orca": "ORCA", "Meteora": "MET", "Kamino": "KMNO",
    "Solend": "SLND", "Phantom": "PHM", "Saber": "SBR", "Hubble": "HBB",
    "UXD": "UXP", "Star Atlas": "ATLAS",
  };
  return symbols[name] || name.slice(0, 4).toUpperCase();
}
