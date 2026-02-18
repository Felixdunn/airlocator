// Reddit Scraper - Monitors crypto subreddits for airdrop announcements
// Scrapes r/CryptoAirdrops, r/solana, r/ethereum, r/CryptoCurrency, etc.

import { DiscoveryResult, Airdrop } from "@/lib/types/airdrop";

const CONFIG = {
  TIMEOUT: 10000,
  DELAY_BETWEEN_REQUESTS: 1500,
  MAX_POSTS_PER_SUBREDDIT: 25,
};

const SUBREDDITS = [
  'CryptoAirdrops',
  'solana',
  'ethereum',
  'CryptoCurrency',
  'defi',
  'NFT',
  'base',
  'arbitrum',
  'optimism',
  'layerzero',
  'zksync',
  'Starknet',
  'sui',
  'aptos',
  'CosmosNetwork',
  'polkadot',
];

const AIRDROP_KEYWORDS = [
  'airdrop', 'claim', 'eligibility', 'snapshot', 'token distribution',
  'retroactive', 'rewards', 'points', 'season', 'allocation',
];

export interface RedditPost {
  title: string;
  url: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  selftext: string;
  subreddit: string;
  permalink: string;
}

export async function scrapeReddit(options?: { limit?: number }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 50;
  
  console.log(`[Reddit Scraper] Starting scan of ${SUBREDDITS.length} subreddits`);
  
  for (const subreddit of SUBREDDITS) {
    try {
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
      
      const posts = await fetchSubredditPosts(subreddit);
      
      for (const post of posts) {
        const analysis = analyzeRedditPost(post);
        if (analysis && analysis.score >= 0.5) {
          results.push(createAirdropFromPost(post, analysis));
        }
        if (results.length >= limit) break;
      }
      
      if (results.length >= limit) break;
    } catch (error) {
      errors.push(`r/${subreddit}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  // Sort by score and confidence
  results.sort((a, b) => (b as any).engagement - (a as any).engagement);
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "reddit",
    scrapedAt: new Date(),
  };
}

async function fetchSubredditPosts(subreddit: string): Promise<RedditPost[]> {
  // Use Reddit JSON API (no auth required for public subreddits)
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${CONFIG.MAX_POSTS_PER_SUBREDDIT}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AirdropTracker/1.0)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.data?.children || []).map((child: any) => ({
      title: child.data.title,
      url: child.data.url,
      author: child.data.author,
      created_utc: child.data.created_utc,
      score: child.data.score,
      num_comments: child.data.num_comments,
      selftext: child.data.selftext,
      subreddit: child.data.subreddit,
      permalink: child.data.permalink,
    }));
  } catch {
    return [];
  }
}

function analyzeRedditPost(post: RedditPost): { score: number; keywords: string[]; signals: string[]; engagement: number } | null {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  // Keyword matching
  for (const keyword of AIRDROP_KEYWORDS) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += keyword === 'airdrop' ? 1.0 : 0.5;
    }
  }
  
  // Engagement scoring
  const engagement = post.score + (post.num_comments * 2);
  if (engagement > 1000) {
    score += 0.3;
    signals.push('high_engagement');
  } else if (engagement > 100) {
    score += 0.15;
  }
  
  // Recency bonus
  const hoursOld = (Date.now() / 1000 - post.created_utc) / 3600;
  if (hoursOld < 24) score += 0.2;
  else if (hoursOld < 72) score += 0.1;
  else if (hoursOld > 168) score -= 0.2;
  
  // Subreddit bonus
  const trustedSubreddits = ['CryptoAirdrops', 'solana', 'ethereum', 'CryptoCurrency'];
  if (trustedSubreddits.includes(post.subreddit)) {
    score += 0.1;
    signals.push('trusted_subreddit');
  }
  
  // Penalty for obvious scams
  const scamIndicators = ['send eth', 'send sol', 'private key', 'seed phrase', 'giveaway'];
  for (const indicator of scamIndicators) {
    if (text.includes(indicator)) {
      score -= 0.5;
      signals.push('potential_scam');
    }
  }
  
  score = Math.min(Math.max(score, 0), 1);
  if (foundKeywords.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals, engagement };
}

function createAirdropFromPost(post: RedditPost, analysis: any): Partial<Airdrop> {
  return {
    name: extractProjectName(post.title),
    symbol: deriveSymbol(post.title),
    description: sanitizeText(post.selftext || post.title, 500),
    website: post.url.startsWith('http') ? post.url : `https://reddit.com${post.permalink}`,
    categories: categorizeBySubreddit(post.subreddit),
    status: analysis.signals.includes('high_engagement') ? 'live' : 'unverified',
    verified: analysis.score > 0.8 && !analysis.signals.includes('potential_scam'),
    featured: analysis.score > 0.85,
    frictionLevel: 'medium' as const,
    claimType: 'mixed' as const,
    estimatedValueUSD: estimateValue(analysis.score, analysis.engagement),
    sources: [{
      type: 'reddit' as const,
      url: `https://reddit.com${post.permalink}`,
      fetchedAt: new Date(),
      confidence: analysis.score,
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    communityScore: analysis.engagement,
  } as Partial<Airdrop>;
}

// Utilities
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractProjectName(title: string): string {
  const match = title.match(/^([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)*)/);
  return match ? match[1] : title.split(' ').slice(0, 3).join(' ');
}

function deriveSymbol(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
}

function sanitizeText(text: string, max: number): string {
  return text.replace(/[<>]/g, '').replace(/javascript:/gi, '').trim().slice(0, max) + (text.length > max ? '...' : '');
}

function categorizeBySubreddit(subreddit: string): string[] {
  const mapping: Record<string, string[]> = {
    'solana': ['DeFi', 'Infrastructure'],
    'ethereum': ['DeFi', 'Layer 2'],
    'defi': ['DeFi'],
    'NFT': ['NFTs'],
    'base': ['Layer 2', 'DeFi'],
    'arbitrum': ['Layer 2', 'DeFi'],
    'optimism': ['Layer 2', 'DeFi'],
    'zksync': ['Layer 2'],
    'Starknet': ['Layer 2'],
    'sui': ['DeFi'],
    'aptos': ['DeFi'],
    'CosmosNetwork': ['Infrastructure'],
    'polkadot': ['Infrastructure'],
  };
  return mapping[subreddit] || ['DeFi'];
}

function estimateValue(score: number, engagement: number): number | undefined {
  let value = 150;
  value *= (0.5 + score * 0.5);
  if (engagement > 1000) value *= 1.5;
  else if (engagement > 500) value *= 1.2;
  return Math.round(value);
}
