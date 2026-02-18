// RSS Feed Scraper - Discovers airdrops from protocol blogs and news sites
// Uses RSS 2.0 and Atom feed parsing

import { ScrapedContent, DiscoveryResult, AirdropSource } from "@/lib/types/airdrop";

// Protocol blogs and news sources with RSS feeds
const RSS_FEEDS = [
  // Protocol blogs
  { name: "Solana Foundation", url: "https://solana.com/news", category: "ecosystem" },
  { name: "Jupiter", url: "https://blog.jup.ag", category: "defi" },
  { name: "Magic Eden", url: "https://magiceden.io/blog", category: "nft" },
  { name: "Phantom", url: "https://phantom.app/blog", category: "wallet" },
  { name: "Marinade Finance", url: "https://marinade.finance/blog", category: "defi" },
  { name: "Raydium", url: "https://raydium.io/blog", category: "defi" },
  { name: "Orca", url: "https://www.orca.so/blog", category: "defi" },
  { name: "Meteora", url: "https://meteora.ag/blog", category: "defi" },
  { name: "Kamino", url: "https://kamino.finance/blog", category: "defi" },
  { name: "Drift Protocol", url: "https://drift.trade/blog", category: "defi" },
  { name: "Tensor", url: "https://tensor.trade/blog", category: "nft" },
  { name: "Wormhole", url: "https://wormhole.com/blog", category: "bridge" },
  { name: "Pyth Network", url: "https://pyth.network/blog", category: "oracle" },
  { name: "Jito", url: "https://jito.network/blog", category: "defi" },
  { name: "MarginFi", url: "https://marginfi.com/blog", category: "defi" },
  { name: "Solend", url: "https://solend.fi/blog", category: "defi" },
  { name: "Star Atlas", url: "https://staratlas.com/blog", category: "gaming" },
  { name: "Aurory", url: "https://aurory.io/blog", category: "gaming" },
  { name: "Genopets", url: "https://genopets.me/blog", category: "gaming" },
  { name: "Sharky", url: "https://sharky.fi/blog", category: "defi" },
  
  // News aggregators
  { name: "Solana Beach", url: "https://solanabeach.io/blog", category: "ecosystem" },
  { name: "Solana Floor", url: "https://solanafloor.com", category: "nft" },
  { name: "The Solana Post", url: "https://thesolanapost.com", category: "ecosystem" },
  
  // Crypto news
  { name: "CoinDesk Solana", url: "https://coindesk.com/tag/solana", category: "news" },
  { name: "Cointelegraph Solana", url: "https://cointelegraph.com/tags/solana", category: "news" },
  { name: "Decrypt Solana", url: "https://decrypt.co/tag/solana", category: "news" },
];

// Airdrop-related keywords
const AIRDROP_KEYWORDS = [
  "airdrop",
  "token",
  "claim",
  "eligibility",
  "snapshot",
  "distribution",
  "rewards",
  "retroactive",
  "points",
  "season",
  "allocation",
  "genesis",
  "launch",
  "TGE",
  "token generation",
  "community rewards",
  "early user",
  "loyalty rewards",
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

export async function scrapeRSSFeeds(
  options?: { limit?: number }
): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 30;
  
  for (const feed of RSS_FEEDS) {
    try {
      const items = await fetchRSSFeed(feed.url);
      
      for (const item of items.slice(0, 5)) {
        const analysis = analyzeContentForAirdrop(
          item.title,
          item.description || "",
          item.link,
          feed.name,
          item.pubDate ? new Date(item.pubDate) : undefined
        );
        
        if (analysis && analysis.confidence > 0.5) {
          const airdropData = extractAirdropData(item, feed, analysis);
          
          if (airdropData) {
            results.push(airdropData);
          }
        }
        
        if (results.length >= limit) break;
      }
      
      if (results.length >= limit) break;
      
    } catch (error) {
      console.error(`Error scraping RSS feed ${feed.name}:`, error);
      errors.push(`${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: results.length > 0,
    airdrops: results,
    errors,
    source: "rss",
    scrapedAt: new Date(),
  };
}

async function fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
  // Use rss2json API for parsing (free tier: 10,000 requests/day)
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  
  const response = await fetch(proxyUrl, {
    next: { revalidate: 1800 },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.status !== "ok") {
    throw new Error("Invalid RSS response");
  }
  
  return data.items.map((item: any) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: item.description?.slice(0, 500),
    content: item.content,
    author: item.author,
    imageUrl: item.thumbnail || item.enclosure?.link,
  }));
}

function analyzeContentForAirdrop(
  title: string,
  description: string,
  url: string,
  source: string,
  pubDate?: Date
): { confidence: number; keywords: string[]; signal: string } | null {
  const text = `${title} ${description}`.toLowerCase();
  
  const foundKeywords: string[] = [];
  let confidence = 0;
  let signal = "";
  
  // Check for airdrop keywords
  for (const keyword of AIRDROP_KEYWORDS) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      
      // Higher confidence for specific keywords
      if (["airdrop", "claim", "eligibility", "snapshot"].includes(keyword)) {
        confidence += 0.25;
      } else if (["token", "rewards", "points"].includes(keyword)) {
        confidence += 0.15;
      } else {
        confidence += 0.08;
      }
    }
  }
  
  // Check for project name + token combination
  const hasTokenMention = text.includes("token") || text.includes("$");
  const hasLaunchMention = text.includes("launch") || text.includes("announcing");
  
  if (hasTokenMention && hasLaunchMention) {
    confidence += 0.2;
    signal = "token_launch";
  }
  
  // Check for claim-related phrases
  const claimPhrases = [
    "claim now",
    "check eligibility",
    "claim your",
    "airdrop live",
    "distribution begins",
  ];
  
  for (const phrase of claimPhrases) {
    if (text.includes(phrase)) {
      confidence += 0.3;
      signal = "claim_announcement";
      break;
    }
  }
  
  // Recency bonus
  if (pubDate) {
    const daysSincePublished = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublished < 7) {
      confidence += 0.15;
    } else if (daysSincePublished < 30) {
      confidence += 0.05;
    } else if (daysSincePublished > 90) {
      confidence -= 0.2;
    }
  }
  
  // Penalty for obvious non-airdrop content
  const nonAirdropPhrases = [
    "partnership",
    "integration",
    "listing",
    "hackathon",
    "event",
    "conference",
    "AMA",
  ];
  
  for (const phrase of nonAirdropPhrases) {
    if (text.includes(phrase) && !foundKeywords.includes("airdrop")) {
      confidence -= 0.1;
    }
  }
  
  if (foundKeywords.length === 0 && !signal) {
    return null;
  }
  
  return {
    confidence: Math.min(Math.max(confidence, 0), 1),
    keywords: foundKeywords,
    signal,
  };
}

function extractAirdropData(
  item: RSSItem,
  feed: typeof RSS_FEEDS[0],
  analysis: { confidence: number; keywords: string[]; signal: string }
): Partial<Airdrop> | null {
  const categories = categorizeFeed(feed.category);
  
  // Extract potential project name from title
  const projectName = extractProjectName(item.title, feed.name);
  
  // Try to extract claim URL from content
  const claimUrl = extractClaimUrl(item.description || "", item.link);
  
  // Estimate value based on keywords
  const estimatedValue = estimateAirdropValue(analysis.keywords, feed.category);
  
  return {
    name: projectName,
    symbol: deriveSymbolFromName(projectName),
    description: truncateText(item.description || item.title, 500),
    website: item.link,
    blog: feed.url,
    categories,
    status: analysis.signal === "claim_announcement" ? "live" : "unverified",
    verified: analysis.confidence > 0.85,
    featured: analysis.confidence > 0.8,
    frictionLevel: estimateFrictionLevel(analysis.keywords),
    claimType: claimUrl ? "on-chain" : "mixed",
    claimUrl: claimUrl || undefined,
    estimatedValueUSD: estimatedValue,
    sources: [{
      type: "rss" as const,
      url: item.link,
      fetchedAt: new Date(),
      confidence: analysis.confidence,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function extractProjectName(title: string, feedName: string): string {
  // Try to extract project name from title
  const patterns = [
    /([A-Z][a-zA-Z]+) (?:Airdrop|Token|Launch)/i,
    /(?:Announcing|Introducing) ([A-Z][a-zA-Z]+)/,
    /^([A-Z][a-zA-Z]+):/,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Fall back to feed name
  return feedName;
}

function extractClaimUrl(content: string, baseUrl: string): string | null {
  // Look for claim-related URLs
  const claimPatterns = [
    /claim\.([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi,
    /airdrop\.([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi,
    /app\.([a-zA-Z0-9-]+\.[a-zA-Z]{2,})\/claim/gi,
    /(https?:\/\/[^\s]+claim[^\s]*)/gi,
  ];
  
  for (const pattern of claimPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      let url = matches[0];
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      return url;
    }
  }
  
  return null;
}

function estimateAirdropValue(keywords: string[], category: string): number | undefined {
  // Very rough estimation based on historical data
  const baseValues: Record<string, number> = {
    "defi": 200,
    "nft": 100,
    "gaming": 75,
    "bridge": 250,
    "oracle": 150,
    "wallet": 100,
    "ecosystem": 300,
    "news": 50,
  };
  
  let value = baseValues[category] || 100;
  
  // Adjust based on keywords
  if (keywords.includes("retroactive")) value *= 2;
  if (keywords.includes("early user")) value *= 1.5;
  if (keywords.includes("points")) value *= 0.5;
  
  return Math.round(value);
}

function estimateFrictionLevel(keywords: string[]): "low" | "medium" | "high" {
  if (keywords.includes("claim now") || keywords.includes("snapshot")) {
    return "low";
  }
  if (keywords.includes("points") || keywords.includes("season")) {
    return "medium";
  }
  return "high";
}

function categorizeFeed(category: string): Array<typeof import("@/lib/types/airdrop").AirdropCategory> {
  const mapping: Record<string, Array<typeof import("@/lib/types/airdrop").AirdropCategory>> = {
    "defi": ["DeFi"],
    "nft": ["NFTs"],
    "gaming": ["Gaming"],
    "bridge": ["Bridges"],
    "oracle": ["Oracle", "Infrastructure"],
    "wallet": ["Wallet", "Infrastructure"],
    "ecosystem": ["Infrastructure"],
    "news": ["DeFi"],
  };
  
  return mapping[category] || ["DeFi"];
}

function deriveSymbolFromName(name: string): string {
  // Simple derivation
  return name.slice(0, 4).toUpperCase();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
