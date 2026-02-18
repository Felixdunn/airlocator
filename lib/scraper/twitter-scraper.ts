// Twitter/X Scraper - Discovers airdrop announcements from Twitter
// Uses Twitter API v2 (requires bearer token) or fallback to public scraping

import { DiscoveryResult, AirdropSource } from "@/lib/types/airdrop";

// Solana projects and influencers to monitor
const TWITTER_ACCOUNTS = [
  // Major protocols
  { username: "solana", name: "Solana", category: "ecosystem" },
  { username: "JupiterExchange", name: "Jupiter", category: "defi" },
  { username: "jito_sol", name: "Jito", category: "defi" },
  { username: "PythNetwork", name: "Pyth Network", category: "oracle" },
  { username: "marginfi", name: "MarginFi", category: "defi" },
  { username: "DriftProtocol", name: "Drift", category: "defi" },
  { username: "TensorTrade", name: "Tensor", category: "nft" },
  { username: "SharkyFi", name: "Sharky", category: "defi" },
  { username: "wormhole", name: "Wormhole", category: "bridge" },
  { username: "staratlas", name: "Star Atlas", category: "gaming" },
  { username: "RaydiumProtocol", name: "Raydium", category: "defi" },
  { username: "orca_so", name: "Orca", category: "defi" },
  { username: "MeteoraAG", name: "Meteora", category: "defi" },
  { username: "KaminoFinance", name: "Kamino", category: "defi" },
  { username: "solendprotocol", name: "Solend", category: "defi" },
  { username: "Phantom", name: "Phantom", category: "wallet" },
  { username: "MagicEden", name: "Magic Eden", category: "nft" },
  { username: "saber_hq", name: "Saber", category: "defi" },
  { username: "HubbleProtocol", name: "Hubble", category: "defi" },
  { username: "UXDProtocol", name: "UXD", category: "defi" },
  
  // Airdrop hunters/influencers
  { username: "lookonchain", name: "Lookonchain", category: "news" },
  { username: "whale_alert", name: "Whale Alert", category: "news" },
  { username: "DeFiMoon", name: "DeFi Moon", category: "news" },
  { username: "AirdropOfficial", name: "Airdrop Official", category: "news" },
  { username: "cryptoalexo", name: "Alexo", category: "influencer" },
  { username: "DefiIgnas", name: "DeFi Ignas", category: "influencer" },
];

// Airdrop-related keywords and phrases
const AIRDROP_PHRASES = [
  "airdrop",
  "air drop",
  "$airdrop",
  "claim now",
  "check eligibility",
  "snapshot taken",
  "token distribution",
  "retroactive",
  "season rewards",
  "points program",
  "claim live",
  "airdrop live",
  "token claim",
  "eligibility check",
  "genesis drop",
  "community drop",
];

// High-signal phrases (stronger indication)
const HIGH_SIGNAL_PHRASES = [
  "airdrop is live",
  "claim your",
  "check if you're eligible",
  "snapshot has been taken",
  "retroactive airdrop",
  "token generation event",
  "TGE announcement",
];

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  entities?: {
    urls?: Array<{
      url: string;
      expanded_url: string;
      display_url: string;
    }>;
    hashtags?: Array<{
      tag: string;
    }>;
  };
  source_account: string;
}

export async function scrapeTwitter(
  options?: { limit?: number }
): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 30;
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  // If no Twitter token, return empty results (don't fail)
  if (!bearerToken) {
    console.log("Twitter API token not configured, skipping Twitter scrape");
    return {
      success: false,
      airdrops: [],
      errors: ["Twitter API token not configured"],
      source: "twitter",
      scrapedAt: new Date(),
    };
  }
  
  for (const account of TWITTER_ACCOUNTS) {
    try {
      const tweets = await fetchAccountTweets(account.username, bearerToken);
      
      for (const tweet of tweets.slice(0, 10)) {
        const analysis = analyzeTweetForAirdrop(tweet);
        
        if (analysis && analysis.confidence > 0.5) {
          const airdropData = extractAirdropFromTweet(tweet, account, analysis);
          
          if (airdropData) {
            results.push(airdropData);
          }
        }
        
        if (results.length >= limit) break;
      }
      
      if (results.length >= limit) break;
      
    } catch (error) {
      console.error(`Error scraping Twitter @${account.username}:`, error);
      errors.push(`@${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: results.length > 0,
    airdrops: results,
    errors,
    source: "twitter",
    scrapedAt: new Date(),
  };
}

async function fetchAccountTweets(
  username: string,
  bearerToken: string
): Promise<Tweet[]> {
  // Get user ID first
  const userResponse = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}`,
    {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
      },
      next: { revalidate: 3600 },
    }
  );
  
  if (!userResponse.ok) {
    if (userResponse.status === 429) {
      throw new Error("Twitter API rate limit exceeded");
    }
    return [];
  }
  
  const user = await userResponse.json();
  const userId = user.data.id;
  
  // Get recent tweets
  const tweetsResponse = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,entities&expansions=author_id`,
    {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
      },
      next: { revalidate: 900 },
    }
  );
  
  if (!tweetsResponse.ok) {
    return [];
  }
  
  const tweets = await tweetsResponse.json();
  
  return (tweets.data || []).map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    author_id: tweet.author_id,
    created_at: tweet.created_at,
    public_metrics: tweet.public_metrics,
    entities: tweet.entities,
    source_account: username,
  }));
}

function analyzeTweetForAirdrop(tweet: Tweet): {
  confidence: number;
  keywords: string[];
  signal: string;
  engagement: number;
} | null {
  const text = tweet.text.toLowerCase();
  
  const foundKeywords: string[] = [];
  let confidence = 0;
  let signal = "";
  
  // Check for high-signal phrases
  for (const phrase of HIGH_SIGNAL_PHRASES) {
    if (text.includes(phrase)) {
      foundKeywords.push(phrase);
      confidence += 0.4;
      signal = "high_signal";
    }
  }
  
  // Check for airdrop keywords
  for (const keyword of AIRDROP_PHRASES) {
    if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
      
      if (["airdrop", "claim", "eligibility", "snapshot"].includes(keyword)) {
        confidence += 0.2;
      } else {
        confidence += 0.1;
      }
    }
  }
  
  // Check for URLs (often link to claim pages)
  const hasUrl = tweet.entities?.urls && tweet.entities.urls.length > 0;
  if (hasUrl) {
    confidence += 0.1;
    
    // Extra confidence for claim-related URLs
    for (const url of tweet.entities!.urls!) {
      const urlText = url.expanded_url.toLowerCase();
      if (urlText.includes("claim") || urlText.includes("airdrop")) {
        confidence += 0.2;
        signal = "claim_url";
      }
    }
  }
  
  // Check for hashtags
  const airdropHashtags = ["#airdrop", "#cryptoairdrop", "#solanaairdrop"];
  if (tweet.entities?.hashtags) {
    for (const hashtag of tweet.entities.hashtags) {
      if (airdropHashtags.includes(hashtag.tag.toLowerCase())) {
        confidence += 0.15;
        foundKeywords.push(hashtag.tag);
      }
    }
  }
  
  // Calculate engagement score
  const engagement = 
    tweet.public_metrics.like_count +
    tweet.public_metrics.retweet_count * 2 +
    tweet.public_metrics.reply_count * 0.5;
  
  // Bonus for high engagement (more likely to be important)
  if (engagement > 1000) {
    confidence += 0.15;
  } else if (engagement > 100) {
    confidence += 0.05;
  }
  
  // Recency bonus
  const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
  const hoursSinceTweet = tweetAge / (1000 * 60 * 60);
  
  if (hoursSinceTweet < 24) {
    confidence += 0.2;
  } else if (hoursSinceTweet < 72) {
    confidence += 0.1;
  } else if (hoursSinceTweet > 168) {
    confidence -= 0.2;
  }
  
  // Penalty for obvious non-airdrop content
  const nonAirdropIndicators = [
    "just bought",
    "just sold",
    "price prediction",
    "technical analysis",
    "chart",
    "partnership with",
    "listing on",
  ];
  
  for (const indicator of nonAirdropIndicators) {
    if (text.includes(indicator) && !foundKeywords.includes("airdrop")) {
      confidence -= 0.15;
    }
  }
  
  if (foundKeywords.length === 0 && !signal) {
    return null;
  }
  
  return {
    confidence: Math.min(Math.max(confidence, 0), 1),
    keywords: foundKeywords,
    signal,
    engagement,
  };
}

function extractAirdropFromTweet(
  tweet: Tweet,
  account: typeof TWITTER_ACCOUNTS[0],
  analysis: { confidence: number; keywords: string[]; signal: string; engagement: number }
): Partial<Airdrop> | null {
  const categories = categorizeAccount(account.category);
  
  // Extract claim URL if present
  const claimUrl = tweet.entities?.urls?.[0]?.expanded_url;
  
  // Determine status based on signal
  let status: "live" | "upcoming" | "unverified" = "unverified";
  if (analysis.signal === "claim_url" || analysis.keywords.includes("claim now")) {
    status = "live";
  } else if (analysis.keywords.includes("coming soon") || analysis.keywords.includes("soon")) {
    status = "upcoming";
  }
  
  // Estimate value
  const estimatedValue = estimateAirdropValue(analysis.keywords, account.category, analysis.engagement);
  
  return {
    name: account.name,
    symbol: deriveSymbol(account.name),
    description: truncateText(tweet.text, 280),
    twitter: `https://twitter.com/${account.username}`,
    website: claimUrl || `https://twitter.com/${account.username}`,
    categories,
    status,
    verified: analysis.confidence > 0.85,
    featured: analysis.confidence > 0.8 && analysis.engagement > 500,
    frictionLevel: estimateFrictionLevel(analysis.keywords),
    claimType: claimUrl ? "on-chain" : "mixed",
    claimUrl: claimUrl || undefined,
    estimatedValueUSD: estimatedValue,
    sources: [{
      type: "twitter" as const,
      url: `https://twitter.com/${account.username}/status/${tweet.id}`,
      fetchedAt: new Date(),
      confidence: analysis.confidence,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function estimateAirdropValue(
  keywords: string[],
  category: string,
  engagement: number
): number | undefined {
  const baseValues: Record<string, number> = {
    "defi": 200,
    "nft": 100,
    "gaming": 75,
    "bridge": 250,
    "oracle": 150,
    "wallet": 100,
    "ecosystem": 300,
    "news": 50,
    "influencer": 50,
  };
  
  let value = baseValues[category] || 100;
  
  // Adjust based on keywords
  if (keywords.includes("retroactive")) value *= 2;
  if (keywords.includes("snapshot")) value *= 1.5;
  if (keywords.includes("points")) value *= 0.5;
  
  // Adjust based on engagement
  if (engagement > 5000) value *= 1.5;
  if (engagement > 10000) value *= 2;
  
  return Math.round(value);
}

function estimateFrictionLevel(keywords: string[]): "low" | "medium" | "high" {
  if (keywords.includes("claim now") || keywords.includes("live")) {
    return "low";
  }
  if (keywords.includes("points") || keywords.includes("season")) {
    return "medium";
  }
  return "high";
}

function categorizeAccount(category: string): Array<typeof import("@/lib/types/airdrop").AirdropCategory> {
  const mapping: Record<string, Array<typeof import("@/lib/types/airdrop").AirdropCategory>> = {
    "defi": ["DeFi"],
    "nft": ["NFTs"],
    "gaming": ["Gaming"],
    "bridge": ["Bridges", "Infrastructure"],
    "oracle": ["Oracle", "Infrastructure"],
    "wallet": ["Wallet", "Infrastructure"],
    "ecosystem": ["Infrastructure"],
    "news": ["DeFi"],
    "influencer": ["DeFi"],
  };
  
  return mapping[category] || ["DeFi"];
}

function deriveSymbol(name: string): string {
  const symbols: Record<string, string> = {
    "Jupiter": "JUP",
    "Jito": "JTO",
    "Pyth Network": "PYTH",
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
    "Magic Eden": "ME",
    "Saber": "SBR",
    "Hubble": "HBB",
    "UXD": "UXP",
  };
  
  return symbols[name] || name.slice(0, 4).toUpperCase();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
