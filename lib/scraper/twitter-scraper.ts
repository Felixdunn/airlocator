// Twitter/X Scraper - Enhanced with better rate limiting and signal detection

import { DiscoveryResult } from "@/lib/types/airdrop";

const TWITTER_ACCOUNTS = [
  { username: "solana", name: "Solana", category: "ecosystem" },
  { username: "JupiterExchange", name: "Jupiter", category: "defi" },
  { username: "jito_sol", name: "Jito", category: "defi" },
  { username: "PythNetwork", name: "Pyth Network", category: "oracle" },
  { username: "marginfi", name: "MarginFi", category: "defi" },
  { username: "DriftProtocol", name: "Drift", category: "defi" },
  { username: "TensorTrade", name: "Tensor", category: "nft" },
  { username: "SharkyFi", name: "Sharky", category: "defi" },
  { username: "wormhole", name: "Wormhole", category: "bridge" },
  { username: "RaydiumProtocol", name: "Raydium", category: "defi" },
  { username: "orca_so", name: "Orca", category: "defi" },
  { username: "MeteoraAG", name: "Meteora", category: "defi" },
  { username: "KaminoFinance", name: "Kamino", category: "defi" },
  { username: "Phantom", name: "Phantom", category: "wallet" },
  { username: "MagicEden", name: "Magic Eden", category: "nft" },
];

const AIRDROP_PHRASES = [
  "airdrop", "claim now", "check eligibility", "snapshot taken",
  "retroactive", "token claim", "airdrop live", "claim your",
];

const HIGH_SIGNAL_PHRASES = [
  "airdrop is live", "claim your", "check if you're eligible",
  "snapshot has been taken", "retroactive airdrop",
];

export interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: { retweet_count: number; reply_count: number; like_count: number; quote_count: number; };
  entities?: { urls?: Array<{ url: string; expanded_url: string; }>; hashtags?: Array<{ tag: string; }>; };
  source_account: string;
}

export async function scrapeTwitter(options?: { limit?: number; twitterBearerToken?: string }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 50;
  const bearerToken = options?.twitterBearerToken;
  
  if (!bearerToken) {
    return { success: false, airdrops: [], errors: ["Twitter API token not configured"], source: "twitter", scrapedAt: new Date() };
  }
  
  // Process accounts in batches
  const batchSize = 5;
  for (let i = 0; i < TWITTER_ACCOUNTS.length; i += batchSize) {
    const batch = TWITTER_ACCOUNTS.slice(i, i + batchSize);
    const batchPromises = batch.map(account => fetchAndAnalyzeTweets(account, bearerToken, limit));
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.error) {
          errors.push(result.value.error);
        } else if (result.value.airdrops) {
          results.push(...result.value.airdrops);
        }
      }
    }
    
    if (results.length >= limit) break;
    
    // Delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "twitter",
    scrapedAt: new Date(),
  };
}

async function fetchAndAnalyzeTweets(
  account: typeof TWITTER_ACCOUNTS[0],
  bearerToken: string,
  limit: number
): Promise<{ airdrops?: Partial<Airdrop>[]; error?: string } | null> {
  try {
    const tweets = await fetchAccountTweets(account.username, bearerToken);
    const airdrops: Partial<Airdrop>[] = [];
    
    for (const tweet of tweets.slice(0, 15)) {
      const analysis = analyzeTweetForAirdrop(tweet);
      if (analysis && analysis.score >= 0.5) {
        const airdropData = extractAirdropFromTweet(tweet, account, analysis);
        if (airdropData) airdrops.push(airdropData);
      }
      if (airdrops.length >= Math.ceil(limit / TWITTER_ACCOUNTS.length)) break;
    }
    
    return { airdrops: airdrops };
  } catch (error) {
    return { error: `@${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function fetchAccountTweets(username: string, bearerToken: string): Promise<Tweet[]> {
  // Get user ID
  const userResponse = await fetchWithRetry(
    `https://api.twitter.com/2/users/by/username/${username}`,
    { headers: { "Authorization": `Bearer ${bearerToken}` } }
  );
  if (!userResponse.ok) return [];
  
  const user = await userResponse.json();
  const userId = user.data.id;
  
  // Get tweets
  const tweetsResponse = await fetchWithRetry(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=15&tweet.fields=created_at,public_metrics,entities`,
    { headers: { "Authorization": `Bearer ${bearerToken}` } }
  );
  if (!tweetsResponse.ok) return [];
  
  const tweets = await tweetsResponse.json();
  return (tweets.data || []).map((tweet: any) => ({
    id: tweet.id, text: tweet.text, author_id: tweet.author_id, created_at: tweet.created_at,
    public_metrics: tweet.public_metrics, entities: tweet.entities, source_account: username,
  }));
}

function analyzeTweetForAirdrop(tweet: Tweet): { score: number; keywords: string[]; signals: string[]; engagement: number } | null {
  const text = tweet.text.toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  // High-signal phrases
  for (const phrase of HIGH_SIGNAL_PHRASES) {
    if (text.includes(phrase)) {
      foundKeywords.push(phrase);
      score += 0.4;
      signals.push("high_signal");
    }
  }
  
  // Airdrop keywords
  for (const keyword of AIRDROP_PHRASES) {
    if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
      score += ["airdrop", "claim", "eligibility"].includes(keyword) ? 0.2 : 0.1;
    }
  }
  
  // URL analysis
  const hasUrl = tweet.entities?.urls && tweet.entities.urls.length > 0;
  if (hasUrl) {
    score += 0.1;
    for (const url of tweet.entities!.urls!) {
      const urlText = url.expanded_url.toLowerCase();
      if (urlText.includes("claim") || urlText.includes("airdrop")) {
        score += 0.2;
        signals.push("claim_url");
      }
    }
  }
  
  // Hashtag analysis
  const airdropHashtags = ["#airdrop", "#cryptoairdrop", "#solanaairdrop"];
  if (tweet.entities?.hashtags) {
    for (const hashtag of tweet.entities.hashtags) {
      if (airdropHashtags.includes(hashtag.tag.toLowerCase())) {
        score += 0.15;
        foundKeywords.push(hashtag.tag);
      }
    }
  }
  
  // Engagement score
  const engagement = tweet.public_metrics.like_count + tweet.public_metrics.retweet_count * 2;
  if (engagement > 1000) score += 0.15;
  else if (engagement > 100) score += 0.05;
  
  // Recency bonus
  const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
  const hoursSinceTweet = tweetAge / (1000 * 60 * 60);
  if (hoursSinceTweet < 24) score += 0.2;
  else if (hoursSinceTweet < 72) score += 0.1;
  else if (hoursSinceTweet > 168) score -= 0.2;
  
  // Penalty for non-airdrop content
  const nonAirdropIndicators = ["just bought", "just sold", "price prediction", "chart", "partnership with"];
  for (const indicator of nonAirdropIndicators) {
    if (text.includes(indicator) && !foundKeywords.includes("airdrop")) {
      score -= 0.15;
    }
  }
  
  score = Math.min(Math.max(score, 0), 1);
  
  if (foundKeywords.length === 0 && signals.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals, engagement };
}

function extractAirdropFromTweet(
  tweet: Tweet,
  account: typeof TWITTER_ACCOUNTS[0],
  analysis: { score: number; keywords: string[]; signals: string[]; engagement: number }
): Partial<Airdrop> {
  const categories = categorizeAccount(account.category);
  const claimUrl = tweet.entities?.urls?.[0]?.expanded_url;
  
  let status: "live" | "upcoming" | "unverified" = "unverified";
  if (analysis.signals.includes("claim_url") || analysis.keywords.includes("claim now")) {
    status = "live";
  }
  
  const estimatedValue = estimateValue(account.category, analysis.score, analysis.engagement);
  
  return {
    name: account.name,
    symbol: deriveSymbol(account.name),
    description: truncateText(tweet.text, 280),
    twitter: `https://twitter.com/${account.username}`,
    website: claimUrl || `https://twitter.com/${account.username}`,
    categories,
    status,
    verified: analysis.score > 0.85,
    featured: analysis.score > 0.8 && analysis.engagement > 500,
    frictionLevel: analysis.keywords.includes("claim now") ? "low" : "medium",
    claimType: claimUrl ? "on-chain" : "mixed",
    claimUrl: claimUrl || undefined,
    estimatedValueUSD: estimatedValue,
    sources: [{
      type: "twitter",
      url: `https://twitter.com/${account.username}/status/${tweet.id}`,
      fetchedAt: new Date(),
      confidence: analysis.score,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function estimateValue(category: string, score: number, engagement: number): number | undefined {
  const baseValues: Record<string, number> = {
    "defi": 200, "nft": 100, "gaming": 75, "bridge": 250,
    "oracle": 150, "wallet": 100, "ecosystem": 300,
  };
  let value = baseValues[category] || 100;
  value *= (0.5 + score * 0.5);
  if (engagement > 5000) value *= 1.5;
  else if (engagement > 1000) value *= 1.2;
  return Math.round(value);
}

function categorizeAccount(category: string): string[] {
  const mapping: Record<string, string[]> = {
    "defi": ["DeFi"], "nft": ["NFTs"], "gaming": ["Gaming"],
    "bridge": ["Bridges", "Infrastructure"], "oracle": ["Oracle", "Infrastructure"],
    "wallet": ["Wallet", "Infrastructure"], "ecosystem": ["Infrastructure"],
  };
  return mapping[category] || ["DeFi"];
}

function deriveSymbol(name: string): string {
  const symbols: Record<string, string> = {
    "Jupiter": "JUP", "Jito": "JTO", "Pyth Network": "PYTH", "MarginFi": "MFI",
    "Drift": "DRIFT", "Tensor": "TNSR", "Sharky": "SHARK", "Wormhole": "W",
    "Raydium": "RAY", "Orca": "ORCA", "Meteora": "MET", "Kamino": "KMNO",
    "Phantom": "PHM", "Magic Eden": "ME",
  };
  return symbols[name] || name.slice(0, 4).toUpperCase();
}

function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength).trim() + "...";
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      return response;
    } catch {}
  }
  throw new Error('Fetch failed');
}
