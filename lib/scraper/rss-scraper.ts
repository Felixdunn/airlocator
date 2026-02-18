// RSS Feed Scraper - Enhanced with better parsing and source validation

import { DiscoveryResult } from "@/lib/types/airdrop";

const RSS_FEEDS = [
  // Major protocol blogs
  { name: "Solana Foundation", url: "https://solana.com/news", category: "ecosystem", baseUrl: "https://solana.com" },
  { name: "Jupiter", url: "https://blog.jup.ag/rss", category: "defi", baseUrl: "https://blog.jup.ag" },
  { name: "Magic Eden", url: "https://magiceden.io/blog/rss", category: "nft", baseUrl: "https://magicedien.io" },
  { name: "Phantom", url: "https://phantom.app/blog/rss", category: "wallet", baseUrl: "https://phantom.app" },
  { name: "Marinade Finance", url: "https://marinade.finance/blog/rss", category: "defi", baseUrl: "https://marinade.finance" },
  { name: "Raydium", url: "https://raydium.io/blog/rss", category: "defi", baseUrl: "https://raydium.io" },
  { name: "Orca", url: "https://www.orca.so/blog/rss", category: "defi", baseUrl: "https://orca.so" },
  { name: "Meteora", url: "https://meteora.ag/blog/rss", category: "defi", baseUrl: "https://meteora.ag" },
  { name: "Kamino", url: "https://kamino.finance/blog/rss", category: "defi", baseUrl: "https://kamino.finance" },
  { name: "Drift Protocol", url: "https://drift.trade/blog/rss", category: "defi", baseUrl: "https://drift.trade" },
  { name: "Tensor", url: "https://tensor.trade/blog/rss", category: "nft", baseUrl: "https://tensor.trade" },
  { name: "Wormhole", url: "https://wormhole.com/blog/rss", category: "bridge", baseUrl: "https://wormhole.com" },
  { name: "Pyth Network", url: "https://pyth.network/blog/rss", category: "oracle", baseUrl: "https://pyth.network" },
  { name: "Jito", url: "https://jito.network/blog/rss", category: "defi", baseUrl: "https://jito.network" },
  { name: "MarginFi", url: "https://marginfi.com/blog/rss", category: "defi", baseUrl: "https://marginfi.com" },
  { name: "Solend", url: "https://solend.fi/blog/rss", category: "defi", baseUrl: "https://solend.fi" },
  { name: "Star Atlas", url: "https://staratlas.com/blog/rss", category: "gaming", baseUrl: "https://staratlas.com" },
  { name: "Sharky", url: "https://sharky.fi/blog/rss", category: "defi", baseUrl: "https://sharky.fi" },
];

const AIRDROP_KEYWORDS = [
  "airdrop", "token", "claim", "eligibility", "snapshot", "distribution",
  "rewards", "retroactive", "points", "season", "allocation", "genesis",
  "launch", "TGE", "token generation", "community rewards", "early user",
];

export interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  content?: string;
  author?: string;
  imageUrl?: string;
}

export async function scrapeRSSFeeds(options?: { limit?: number }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 50;
  
  // Process feeds in parallel with concurrency limit
  const concurrencyLimit = 5;
  for (let i = 0; i < RSS_FEEDS.length; i += concurrencyLimit) {
    const batch = RSS_FEEDS.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(feed => scrapeFeed(feed, limit));
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.error) {
          errors.push(result.value.error);
        } else if (result.value.airdrop) {
          results.push(result.value.airdrop);
        }
      }
    }
    
    if (results.length >= limit) break;
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "rss",
    scrapedAt: new Date(),
  };
}

async function scrapeFeed(feed: typeof RSS_FEEDS[0], limit: number): Promise<{ airdrop?: Partial<Airdrop>; error?: string } | null> {
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    
    const response = await fetchWithRetry(proxyUrl);
    if (!response.ok) return { error: `${feed.name}: Failed to fetch` };
    
    const data = await response.json();
    if (data.status !== "ok") return { error: `${feed.name}: Invalid RSS response` };
    
    // Check recent items
    for (const item of data.items.slice(0, 5)) {
      const analysis = analyzeContentForAirdrop(
        item.title,
        item.description || "",
        item.link,
        feed.name,
        feed.category,
        item.pubDate ? new Date(item.pubDate) : undefined
      );
      
      if (analysis && analysis.score >= 0.5) {
        return {
          airdrop: extractAirdropData(item, feed, analysis),
        };
      }
    }
    
    return null;
  } catch (error) {
    return { error: `${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

function analyzeContentForAirdrop(
  title: string,
  description: string,
  url: string,
  source: string,
  category: string,
  pubDate?: Date
): { score: number; keywords: string[]; signals: string[] } | null {
  const text = `${title} ${description}`.toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  // Keyword matching with weights
  const weights: Record<string, number> = {
    "airdrop": 1.0, "claim": 0.8, "eligibility": 0.7, "snapshot": 0.8,
    "token": 0.5, "rewards": 0.6, "retroactive": 0.9, "points": 0.5,
  };
  
  for (const [keyword, weight] of Object.entries(weights)) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += weight;
      if (weight >= 0.8) signals.push("high_confidence");
    }
  }
  
  // Check for claim-related phrases
  const claimPhrases = ["claim now", "check eligibility", "claim your", "airdrop live"];
  for (const phrase of claimPhrases) {
    if (text.includes(phrase)) {
      score += 0.3;
      signals.push("claim_announcement");
    }
  }
  
  // Recency bonus
  if (pubDate) {
    const daysSincePublished = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublished < 7) score += 0.2;
    else if (daysSincePublished < 14) score += 0.1;
    else if (daysSincePublished > 90) score -= 0.2;
  }
  
  // Penalty for non-airdrop content
  const nonAirdropPhrases = ["partnership", "integration", "listing", "hackathon", "AMA"];
  for (const phrase of nonAirdropPhrases) {
    if (text.includes(phrase) && !foundKeywords.includes("airdrop")) {
      score -= 0.1;
    }
  }
  
  score = Math.min(Math.max(score, 0), 1);
  
  if (foundKeywords.length === 0 && signals.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals };
}

function extractAirdropData(
  item: RSSItem,
  feed: typeof RSS_FEEDS[0],
  analysis: { score: number; keywords: string[]; signals: string[] }
): Partial<Airdrop> {
  const categories = categorizeFeed(feed.category);
  const projectName = extractProjectName(item.title, feed.name);
  const claimUrl = extractClaimUrl(item.description || "", item.link);
  const estimatedValue = estimateValue(feed.category, analysis.score, analysis.signals);
  
  return {
    name: projectName,
    symbol: deriveSymbol(projectName),
    description: truncateText(item.description || item.title, 500),
    website: item.link,
    blog: feed.url,
    categories,
    status: analysis.signals.includes("claim_announcement") ? "live" : "unverified",
    verified: analysis.score > 0.85,
    featured: analysis.score > 0.75,
    frictionLevel: analysis.signals.includes("claim_announcement") ? "low" : "medium",
    claimType: claimUrl ? "on-chain" : "mixed",
    claimUrl: claimUrl || undefined,
    estimatedValueUSD: estimatedValue,
    sources: [{
      type: "rss",
      url: item.link,
      fetchedAt: new Date(),
      confidence: analysis.score,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Utility functions
function extractProjectName(title: string, feedName: string): string {
  const patterns = [
    /([A-Z][a-zA-Z]+) (?:Airdrop|Token|Launch)/i,
    /(?:Announcing|Introducing) ([A-Z][a-zA-Z]+)/,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  return feedName;
}

function extractClaimUrl(content: string, baseUrl: string): string | null {
  const claimPatterns = [
    /claim\.([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi,
    /(https?:\/\/[^\s]+claim[^\s]*)/gi,
  ];
  for (const pattern of claimPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      let url = matches[0];
      if (!url.startsWith("http")) url = "https://" + url;
      return url;
    }
  }
  return null;
}

function estimateValue(category: string, score: number, signals: string[]): number | undefined {
  const baseValues: Record<string, number> = {
    "defi": 200, "nft": 100, "gaming": 75, "bridge": 250,
    "oracle": 150, "wallet": 100, "ecosystem": 300,
  };
  let value = baseValues[category] || 100;
  value *= (0.5 + score * 0.5);
  if (signals.includes("claim_announcement")) value *= 1.5;
  return Math.round(value);
}

function categorizeFeed(category: string): string[] {
  const mapping: Record<string, string[]> = {
    "defi": ["DeFi"], "nft": ["NFTs"], "gaming": ["Gaming"],
    "bridge": ["Bridges", "Infrastructure"], "oracle": ["Oracle", "Infrastructure"],
    "wallet": ["Wallet", "Infrastructure"], "ecosystem": ["Infrastructure"],
  };
  return mapping[category] || ["DeFi"];
}

function deriveSymbol(name: string): string {
  return name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "");
}

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength).trim() + "...";
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    } catch {}
  }
  throw new Error('Fetch failed');
}
