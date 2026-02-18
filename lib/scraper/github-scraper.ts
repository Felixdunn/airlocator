// GitHub Scraper - Updated to use API keys from request headers/cookies

import { ScrapedContent, DiscoveryResult, AirdropSource } from "@/lib/types/airdrop";

// Solana projects to monitor for airdrop announcements
const TARGET_REPOS = [
  { owner: "solana-labs", repo: "solana", name: "Solana" },
  { owner: "jito-foundation", repo: "jito-dapps", name: "Jito" },
  { owner: "jup-ag", repo: "core", name: "Jupiter" },
  { owner: "pyth-network", repo: "pyth-sdk-solana", name: "Pyth" },
  { owner: "marginfi", repo: "protocol", name: "MarginFi" },
  { owner: "drift-labs", repo: "protocol-v2", name: "Drift" },
  { owner: "tensor-hq", repo: "tensor-sdk", name: "Tensor" },
  { owner: "sharky-fi", repo: "sharky-protocol", name: "Sharky" },
  { owner: "wormhole-foundation", repo: "wormhole", name: "Wormhole" },
  { owner: "staratlasmeta", repo: "star-atlas", name: "Star Atlas" },
  { owner: "raydium-io", repo: "raydium-sdk", name: "Raydium" },
  { owner: "orca-so", repo: "whirlpool", name: "Orca" },
  { owner: "meteora-ag", repo: "dlmm-sdk", name: "Meteora" },
  { owner: "Kamino-Finance", repo: "lending", name: "Kamino" },
  { owner: "solendprotocol", repo: "solana-program-library", name: "Solend" },
  { owner: "PhantomApp", repo: "phantom-core", name: "Phantom" },
  { owner: "saber-hq", repo: "saber-common", name: "Saber" },
  { owner: "HubbleProtocol", repo: "hubble-contracts", name: "Hubble" },
  { owner: "UXDProtocol", repo: "uxd-program", name: "UXD" },
];

const AIRDROP_KEYWORDS = [
  "airdrop", "token distribution", "token launch", "claim", "eligibility",
  "snapshot", "rewards", "retroactive", "genesis", "TGE", "community allocation",
  "governance token", "points program", "season rewards", "vesting",
];

const HIGH_CONFIDENCE_KEYWORDS = [
  "airdrop", "token distribution", "claim now", "eligibility check",
  "snapshot taken", "retroactive airdrop",
];

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export interface GitHubIssue {
  title: string;
  body: string;
  html_url: string;
  created_at: string;
}

export async function scrapeGitHub(
  options?: { limit?: number; githubToken?: string }
): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const githubToken = options?.githubToken;
  const limit = options?.limit || 50;
  
  for (const repo of TARGET_REPOS) {
    try {
      const releases = await fetchRepoReleases(repo.owner, repo.repo, githubToken);
      
      for (const release of releases) {
        const analysis = analyzeContentForAirdrop(
          release.name,
          release.body,
          release.html_url,
          repo.name,
          new Date(release.published_at)
        );
        
        if (analysis && analysis.confidence > 0.5) {
          results.push(createAirdropFromRelease(repo, release, analysis));
        }
        
        if (results.length >= limit) break;
      }
      
      const issues = await fetchRepoIssues(repo.owner, repo.repo, githubToken);
      
      for (const issue of issues.slice(0, 10)) {
        const analysis = analyzeContentForAirdrop(
          issue.title,
          issue.body,
          issue.html_url,
          repo.name,
          new Date(issue.created_at)
        );
        
        if (analysis && analysis.confidence > 0.6) {
          results.push(createAirdropFromIssue(repo, issue, analysis));
        }
      }
      
    } catch (error) {
      errors.push(`${repo.owner}/${repo.repo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "github",
    scrapedAt: new Date(),
  };
}

async function fetchRepoReleases(owner: string, repo: string, token?: string): Promise<GitHubRelease[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`;
  const headers: HeadersInit = { "Accept": "application/vnd.github.v3+json" };
  if (token) headers["Authorization"] = `token ${token}`;
  
  const response = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
  return response.json();
}

async function fetchRepoIssues(owner: string, repo: string, token?: string): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=20`;
  const headers: HeadersInit = { "Accept": "application/vnd.github.v3+json" };
  if (token) headers["Authorization"] = `token ${token}`;
  
  const response = await fetch(url, { headers, next: { revalidate: 1800 } });
  if (!response.ok) return [];
  return response.json();
}

function analyzeContentForAirdrop(title: string, content: string, url: string, projectName: string, publishedAt: Date) {
  const text = `${title} ${content}`.toLowerCase();
  const foundKeywords: string[] = [];
  let confidence = 0;
  
  for (const keyword of HIGH_CONFIDENCE_KEYWORDS) {
    if (text.includes(keyword)) { foundKeywords.push(keyword); confidence += 0.3; }
  }
  for (const keyword of AIRDROP_KEYWORDS) {
    if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword); confidence += 0.1;
    }
  }
  
  if (foundKeywords.length >= 3) confidence += 0.2;
  const daysSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 30) confidence += 0.1;
  if (daysSincePublished > 180) confidence -= 0.2;
  
  return foundKeywords.length > 0 ? { confidence: Math.min(confidence, 1), keywords: foundKeywords } : null;
}

function createAirdropFromRelease(repo: any, release: GitHubRelease, analysis: any): Partial<Airdrop> {
  return {
    name: repo.name, symbol: deriveSymbol(repo.name),
    description: truncateText(release.body, 500),
    website: release.html_url, github: release.html_url,
    categories: categorizeProject(repo.name), status: "unverified" as const,
    verified: false, featured: analysis.confidence > 0.8, frictionLevel: "low" as const,
    claimType: "on-chain" as const,
    sources: [{ type: "github" as const, url: release.html_url, fetchedAt: new Date(), confidence: analysis.confidence }],
    discoveredAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  };
}

function createAirdropFromIssue(repo: any, issue: GitHubIssue, analysis: any): Partial<Airdrop> {
  return {
    name: repo.name, symbol: deriveSymbol(repo.name),
    description: truncateText(issue.body, 500),
    website: issue.html_url, github: issue.html_url,
    categories: categorizeProject(repo.name), status: "unverified" as const,
    verified: false, featured: analysis.confidence > 0.85, frictionLevel: "medium" as const,
    claimType: "mixed" as const,
    sources: [{ type: "github" as const, url: issue.html_url, fetchedAt: new Date(), confidence: analysis.confidence }],
    discoveredAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  };
}

function deriveSymbol(name: string): string {
  const symbols: Record<string, string> = {
    "Jito": "JTO", "Jupiter": "JUP", "Pyth": "PYTH", "MarginFi": "MFI",
    "Drift": "DRIFT", "Tensor": "TNSR", "Sharky": "SHARK", "Wormhole": "W",
  };
  return symbols[name] || name.slice(0, 4).toUpperCase();
}

function categorizeProject(name: string): string[] {
  const cats: Record<string, string[]> = {
    "Jito": ["Liquid Staking", "DeFi"], "Jupiter": ["DEX", "DeFi"],
    "Pyth": ["Oracle", "Infrastructure"], "MarginFi": ["Lending", "DeFi"],
    "Drift": ["Perpetuals", "DeFi"], "Tensor": ["NFTs"], "Sharky": ["NFTs", "DeFi"],
    "Wormhole": ["Bridges", "Infrastructure"],
  };
  return cats[name] || ["DeFi"];
}

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength).trim() + "...";
}
