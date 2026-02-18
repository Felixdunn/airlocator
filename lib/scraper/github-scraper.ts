// GitHub Scraper - Discovers airdrop announcements from repositories
// Uses GitHub API and web scraping for maximum coverage

import { ScrapedContent, DiscoveryResult, AirdropSource } from "@/lib/types/airdrop";

// Solana projects to monitor for airdrop announcements
const TARGET_REPOS = [
  // Major protocols
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
  { owner: "mercurial-finance", repo: "stable-swap", name: "Mercurial" },
  { owner: "Francium-IO", repo: "Francium", name: "Francium" },
  { owner: "Larix-Project", repo: "larix-sdk", name: "Larix" },
  { owner: "port-finance", repo: "port-program", name: "Port Finance" },
  { owner: "Apricot-Finance", repo: "apricot", name: "Apricot" },
  { owner: "parrot-finance", repo: "parrot-sdk", name: "Parrot" },
  { owner: "synthetify", repo: "synthetify", name: "Synthetify" },
  { owner: "0xNectar", repo: "nectar-staking", name: "Nectar" },
  { owner: "HubbleProtocol", repo: "hubble-contracts", name: "Hubble" },
  { owner: "UXDProtocol", repo: "uxd-program", name: "UXD" },
  { owner: "Oxygen-Protocol", repo: "oxygen", name: "Oxygen" },
  { owner: "Bonfida", repo: "bonfida-sdk", name: "Bonfida" },
  { owner: "DialectXYZ", repo: "dialect", name: "Dialect" },
];

// Keywords indicating airdrop announcements
const AIRDROP_KEYWORDS = [
  "airdrop",
  "token distribution",
  "token launch",
  "claim",
  "eligibility",
  "snapshot",
  "rewards",
  "retroactive",
  "genesis",
  "token generation event",
  "TGE",
  "initial distribution",
  "community allocation",
  "governance token",
  "points program",
  "season rewards",
  "vesting",
  "token claim",
];

// High-confidence keywords (stronger signal)
const HIGH_CONFIDENCE_KEYWORDS = [
  "airdrop",
  "token distribution",
  "claim now",
  "eligibility check",
  "snapshot taken",
  "retroactive airdrop",
];

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  author: {
    login: string;
  };
}

export interface GitHubIssue {
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
}

export interface GitHubDiscussion {
  title: string;
  body: string;
  url: string;
  createdAt: string;
  author: {
    login: string;
  };
}

export async function scrapeGitHub(
  options?: { limit?: number; useApi?: boolean }
): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const githubToken = process.env.GITHUB_TOKEN;
  
  const limit = options?.limit || 50;
  
  for (const repo of TARGET_REPOS) {
    try {
      // Fetch releases
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
          results.push({
            name: repo.name,
            symbol: deriveSymbol(repo.name),
            description: truncateText(release.body, 500),
            website: `https://github.com/${repo.owner}/${repo.repo}`,
            github: `https://github.com/${repo.owner}/${repo.repo}`,
            categories: categorizeProject(repo.name),
            status: "unverified" as const,
            verified: false,
            featured: analysis.confidence > 0.8,
            frictionLevel: "low" as const,
            claimType: "on-chain" as const,
            sources: [{
              type: "github" as const,
              url: release.html_url,
              fetchedAt: new Date(),
              confidence: analysis.confidence,
            }],
            discoveredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        
        if (results.length >= limit) break;
      }
      
      // Fetch recent issues/discussions
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
          results.push({
            name: repo.name,
            symbol: deriveSymbol(repo.name),
            description: truncateText(issue.body, 500),
            website: `https://github.com/${repo.owner}/${repo.repo}`,
            github: `https://github.com/${repo.owner}/${repo.repo}`,
            categories: categorizeProject(repo.name),
            status: "unverified" as const,
            verified: false,
            featured: analysis.confidence > 0.85,
            frictionLevel: "medium" as const,
            claimType: "mixed" as const,
            sources: [{
              type: "github" as const,
              url: issue.html_url,
              fetchedAt: new Date(),
              confidence: analysis.confidence,
            }],
            discoveredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      
    } catch (error) {
      console.error(`Error scraping ${repo.owner}/${repo.repo}:`, error);
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

async function fetchRepoReleases(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRelease[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`;
  
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  
  const response = await fetch(url, {
    headers,
    next: { revalidate: 3600 },
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded");
    }
    return [];
  }
  
  return response.json();
}

async function fetchRepoIssues(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=20`;
  
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  
  const response = await fetch(url, {
    headers,
    next: { revalidate: 1800 },
  });
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

function analyzeContentForAirdrop(
  title: string,
  content: string,
  url: string,
  projectName: string,
  publishedAt: Date
): { confidence: number; keywords: string[] } | null {
  const text = `${title} ${content}`.toLowerCase();
  
  const foundKeywords: string[] = [];
  let confidence = 0;
  
  // Check for high-confidence keywords
  for (const keyword of HIGH_CONFIDENCE_KEYWORDS) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      confidence += 0.3;
    }
  }
  
  // Check for regular keywords
  for (const keyword of AIRDROP_KEYWORDS) {
    if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
      confidence += 0.1;
    }
  }
  
  // Bonus for multiple keyword matches
  if (foundKeywords.length >= 3) {
    confidence += 0.2;
  }
  
  // Bonus for recent content (more likely to be relevant)
  const daysSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 30) {
    confidence += 0.1;
  }
  
  // Penalty for old content
  if (daysSincePublished > 180) {
    confidence -= 0.2;
  }
  
  if (foundKeywords.length === 0) {
    return null;
  }
  
  return {
    confidence: Math.min(confidence, 1),
    keywords: foundKeywords,
  };
}

function deriveSymbol(projectName: string): string {
  // Simple derivation - in production, would fetch from token metadata
  const symbols: Record<string, string> = {
    "Jito": "JTO",
    "Jupiter": "JUP",
    "Pyth": "PYTH",
    "MarginFi": "MFI",
    "Drift": "DRIFT",
    "Tensor": "TNSR",
    "Sharky": "SHARK",
    "Wormhole": "W",
    "Star Atlas": "ATLAS",
    "Raydium": "RAY",
    "Orca": "ORCA",
    "Meteora": "MET",
    "Kamino": "KMNO",
    "Solend": "SLND",
    "Phantom": "PHM",
    "Saber": "SBR",
    "Mercurial": "MER",
    "Francium": "FRX",
    "Larix": "LARIX",
    "Parrot": "PRT",
    "Synthetify": "SNY",
    "Hubble": "HBB",
    "UXD": "UXP",
    "Oxygen": "OXY",
    "Bonfida": "FIDA",
  };
  
  return symbols[projectName] || projectName.slice(0, 4).toUpperCase();
}

function categorizeProject(projectName: string): Array<typeof import("@/lib/types/airdrop").AirdropCategory> {
  const categories: Record<string, Array<typeof import("@/lib/types/airdrop").AirdropCategory>> = {
    "Jito": ["Liquid Staking", "DeFi"],
    "Jupiter": ["DEX", "DeFi"],
    "Pyth": ["Oracle", "Infrastructure"],
    "MarginFi": ["Lending", "DeFi"],
    "Drift": ["Perpetuals", "DeFi"],
    "Tensor": ["NFTs", "DeFi"],
    "Sharky": ["NFTs", "Lending"],
    "Wormhole": ["Bridges", "Infrastructure"],
    "Star Atlas": ["Gaming", "NFTs"],
    "Raydium": ["DEX", "DeFi"],
    "Orca": ["DEX", "DeFi"],
    "Meteora": ["DEX", "DeFi"],
    "Kamino": ["Lending", "DeFi"],
    "Solend": ["Lending", "DeFi"],
    "Phantom": ["Wallet", "Infrastructure"],
    "Saber": ["DEX", "DeFi"],
    "Mercurial": ["DEX", "DeFi"],
    "Francium": ["DeFi", "Infrastructure"],
    "Larix": ["Lending", "DeFi"],
    "Parrot": ["Liquid Staking", "DeFi"],
    "Synthetify": ["DeFi", "Perpetuals"],
    "Hubble": ["Lending", "DeFi"],
    "UXD": ["DeFi", "Infrastructure"],
    "Oxygen": ["DeFi", "Infrastructure"],
    "Bonfida": ["Infrastructure", "DeFi"],
  };
  
  return categories[projectName] || ["DeFi"];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
