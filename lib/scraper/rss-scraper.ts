// RSS Feed Scraper - Security-hardened with best practices
// Implements: rate limiting, concurrent processing, input sanitization

import { DiscoveryResult, Airdrop } from "@/lib/types/airdrop";

const CONFIG = {
  CONCURRENCY_LIMIT: 5,
  BATCH_DELAY: 2000,
  TIMEOUT: 10000,
  MAX_RETRIES: 3,
};

const RSS_FEEDS = [
  { name: "Solana Foundation", url: "https://solana.com/news", category: "ecosystem" },
  { name: "Jupiter", url: "https://blog.jup.ag/rss", category: "defi" },
  { name: "Magic Eden", url: "https://magiceden.io/blog/rss", category: "nft" },
  { name: "Phantom", url: "https://phantom.app/blog/rss", category: "wallet" },
  { name: "Marinade Finance", url: "https://marinade.finance/blog/rss", category: "defi" },
  { name: "Raydium", url: "https://raydium.io/blog/rss", category: "defi" },
  { name: "Orca", url: "https://www.orca.so/blog/rss", category: "defi" },
  { name: "Meteora", url: "https://meteora.ag/blog/rss", category: "defi" },
  { name: "Kamino", url: "https://kamino.finance/blog/rss", category: "defi" },
  { name: "Drift Protocol", url: "https://drift.trade/blog/rss", category: "defi" },
  { name: "Tensor", url: "https://tensor.trade/blog/rss", category: "nft" },
  { name: "Wormhole", url: "https://wormhole.com/blog/rss", category: "bridge" },
  { name: "Pyth Network", url: "https://pyth.network/blog/rss", category: "oracle" },
  { name: "Jito", url: "https://jito.network/blog/rss", category: "defi" },
  { name: "MarginFi", url: "https://marginfi.com/blog/rss", category: "defi" },
  { name: "Solend", url: "https://solend.fi/blog/rss", category: "defi" },
  { name: "Star Atlas", url: "https://staratlas.com/blog/rss", category: "gaming" },
  { name: "Sharky", url: "https://sharky.fi/blog/rss", category: "defi" },
];

const KEYWORD_WEIGHTS: Record<string, number> = {
  "airdrop": 1.0, "claim": 0.8, "eligibility": 0.7, "snapshot": 0.8,
  "token": 0.5, "rewards": 0.6, "retroactive": 0.9, "points": 0.5,
  "distribution": 0.6, "launch": 0.5, "TGE": 0.7,
};

export async function scrapeRSSFeeds(options?: { limit?: number }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 50;
  
  console.log(`[RSS Scraper] Starting with ${RSS_FEEDS.length} feeds`);
  
  // Process feeds in batches with concurrency limit
  const batches = chunkArray(RSS_FEEDS, CONFIG.CONCURRENCY_LIMIT);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`[RSS Scraper] Processing batch ${batchIndex + 1}/${batches.length}`);
    
    const batchPromises = batch.map(feed => scrapeFeed(feed));
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
    
    // Delay between batches
    if (batchIndex < batches.length - 1) {
      await sleep(CONFIG.BATCH_DELAY);
    }
  }
  
  // Sort by confidence
  results.sort((a, b) => (b as any).score - (a as any).score);
  
  console.log(`[RSS Scraper] Complete: ${results.length} airdrops found`);
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "rss",
    scrapedAt: new Date(),
  };
}

async function scrapeFeed(feed: typeof RSS_FEEDS[0]): Promise<{ airdrop?: Partial<Airdrop>; error?: string } | null> {
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    
    const response = await fetchWithRetry(proxyUrl);
    if (!response.ok) {
      return { error: `${feed.name}: Failed to fetch (${response.status})` };
    }
    
    const data = await response.json();
    if (data.status !== "ok") {
      return { error: `${feed.name}: Invalid RSS response` };
    }
    
    // Analyze recent items
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
  // Sanitize input
  const text = sanitizeInput(`${title} ${description}`).toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  // Weighted keyword matching
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += weight;
      if (weight >= 0.8) signals.push("high_confidence");
    }
  }
  
  // Claim phrase detection
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
  item: any,
  feed: typeof RSS_FEEDS[0],
  analysis: { score: number; keywords: string[]; signals: string[] }
): Partial<Airdrop> {
  const categories = categorizeFeed(feed.category);
  const projectName = sanitizeInput(extractProjectName(item.title, feed.name));
  const claimUrl = extractClaimUrl(item.description || "", item.link);
  const estimatedValue = estimateValue(feed.category, analysis.score, analysis.signals);
  
  return {
    name: projectName,
    symbol: deriveSymbol(projectName),
    description: sanitizeAndTruncate(item.description || item.title, 500),
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

async function fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) return response;
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = 1000 * Math.pow(2, retryCount);
      await sleep(delay);
      return fetchWithRetry(url, retryCount + 1);
    }
    throw error;
  }
}

// Security functions
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/&#\d+;/g, '')
    .trim();
}

function sanitizeAndTruncate(text: string, maxLength: number): string {
  const sanitized = sanitizeInput(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.slice(0, maxLength).trim() + "...";
}

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
      let url = sanitizeInput(matches[0]);
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
