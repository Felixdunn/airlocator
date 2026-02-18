// Twitter/X Scraper - Updated to accept token from options

import { DiscoveryResult, AirdropSource } from "@/lib/types/airdrop";

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

const AIRDROP_PHRASES = ["airdrop", "claim now", "check eligibility", "snapshot taken", "retroactive", "token claim"];
const HIGH_SIGNAL_PHRASES = ["airdrop is live", "claim your", "check if you're eligible", "snapshot has been taken"];

export interface Tweet {
  id: string; text: string; author_id: string; created_at: string;
  public_metrics: { retweet_count: number; reply_count: number; like_count: number; quote_count: number; };
  entities?: { urls?: Array<{ url: string; expanded_url: string; }>; hashtags?: Array<{ tag: string; }>; };
  source_account: string;
}

export async function scrapeTwitter(options?: { limit?: number; twitterBearerToken?: string }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 30;
  const bearerToken = options?.twitterBearerToken;
  
  if (!bearerToken) {
    return { success: false, airdrops: [], errors: ["Twitter API token not configured"], source: "twitter", scrapedAt: new Date() };
  }
  
  for (const account of TWITTER_ACCOUNTS) {
    try {
      const tweets = await fetchAccountTweets(account.username, bearerToken);
      for (const tweet of tweets.slice(0, 10)) {
        const analysis = analyzeTweetForAirdrop(tweet);
        if (analysis && analysis.confidence > 0.5) {
          const airdropData = extractAirdropFromTweet(tweet, account, analysis);
          if (airdropData) results.push(airdropData);
        }
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    } catch (error) {
      errors.push(`@${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { success: results.length > 0, airdrops: results, errors, source: "twitter", scrapedAt: new Date() };
}

async function fetchAccountTweets(username: string, bearerToken: string): Promise<Tweet[]> {
  const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { "Authorization": `Bearer ${bearerToken}` }, next: { revalidate: 3600 },
  });
  if (!userResponse.ok) return [];
  
  const user = await userResponse.json();
  const userId = user.data.id;
  
  const tweetsResponse = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,entities`,
    { headers: { "Authorization": `Bearer ${bearerToken}` }, next: { revalidate: 900 } }
  );
  if (!tweetsResponse.ok) return [];
  
  const tweets = await tweetsResponse.json();
  return (tweets.data || []).map((tweet: any) => ({
    id: tweet.id, text: tweet.text, author_id: tweet.author_id, created_at: tweet.created_at,
    public_metrics: tweet.public_metrics, entities: tweet.entities, source_account: username,
  }));
}

function analyzeTweetForAirdrop(tweet: Tweet) {
  const text = tweet.text.toLowerCase();
  const foundKeywords: string[] = [];
  let confidence = 0;
  let signal = "";
  
  for (const phrase of HIGH_SIGNAL_PHRASES) {
    if (text.includes(phrase)) { foundKeywords.push(phrase); confidence += 0.4; signal = "high_signal"; }
  }
  for (const keyword of AIRDROP_PHRASES) {
    if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
      confidence += ["airdrop", "claim", "eligibility"].includes(keyword) ? 0.2 : 0.1;
    }
  }
  
  const hasUrl = tweet.entities?.urls && tweet.entities.urls.length > 0;
  if (hasUrl) {
    confidence += 0.1;
    for (const url of tweet.entities!.urls!) {
      if (url.expanded_url.toLowerCase().includes("claim") || url.expanded_url.toLowerCase().includes("airdrop")) {
        confidence += 0.2; signal = "claim_url";
      }
    }
  }
  
  const engagement = tweet.public_metrics.like_count + tweet.public_metrics.retweet_count * 2;
  if (engagement > 1000) confidence += 0.15;
  
  const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
  const hoursSinceTweet = tweetAge / (1000 * 60 * 60);
  if (hoursSinceTweet < 24) confidence += 0.2;
  else if (hoursSinceTweet > 168) confidence -= 0.2;
  
  return foundKeywords.length > 0 ? { confidence: Math.min(confidence, 1), keywords: foundKeywords, signal, engagement } : null;
}

function extractAirdropFromTweet(tweet: Tweet, account: any, analysis: any): Partial<Airdrop> | null {
  const claimUrl = tweet.entities?.urls?.[0]?.expanded_url;
  let status: "live" | "upcoming" | "unverified" = "unverified";
  if (analysis.signal === "claim_url" || analysis.keywords.includes("claim now")) status = "live";
  
  const categories: Record<string, string[]> = {
    "defi": ["DeFi"], "nft": ["NFTs"], "gaming": ["Gaming"], "bridge": ["Bridges"],
    "oracle": ["Oracle", "Infrastructure"], "wallet": ["Wallet"], "ecosystem": ["Infrastructure"],
  };
  
  const symbols: Record<string, string> = {
    "Jupiter": "JUP", "Jito": "JTO", "Pyth Network": "PYTH", "MarginFi": "MFI",
    "Drift": "DRIFT", "Tensor": "TNSR", "Sharky": "SHARK", "Wormhole": "W",
  };
  
  return {
    name: account.name, symbol: symbols[account.name] || account.name.slice(0, 4).toUpperCase(),
    description: tweet.text.slice(0, 280), twitter: `https://twitter.com/${account.username}`,
    website: claimUrl || `https://twitter.com/${account.username}`,
    categories: categories[account.category] || ["DeFi"], status,
    verified: analysis.confidence > 0.85, featured: analysis.confidence > 0.8 && analysis.engagement > 500,
    frictionLevel: analysis.keywords.includes("claim now") ? "low" : "medium",
    claimType: claimUrl ? "on-chain" : "mixed", claimUrl,
    estimatedValueUSD: analysis.engagement > 5000 ? 300 : analysis.engagement > 1000 ? 150 : 50,
    sources: [{ type: "twitter" as const, url: `https://twitter.com/${account.username}/status/${tweet.id}`, fetchedAt: new Date(), confidence: analysis.confidence }],
    discoveredAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  };
}
