// Reddit Scraper - Monitors crypto subreddits for airdrop announcements and giveaways
// Scrapes r/CryptoAirdrops, r/solana, r/ethereum, r/CryptoCurrency, etc.
// Specifically looks for "drop your address" giveaway posts

import { DiscoveryResult, Airdrop } from "@/lib/types/airdrop";

const CONFIG = {
  TIMEOUT: 10000,
  DELAY_BETWEEN_REQUESTS: 1000,
  MAX_POSTS_PER_SUBREDDIT: 50,
};

const SUBREDDITS = [
  'CryptoAirdrops',
  'solanagiveaways',
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
  'CryptoMoonShots',
  'altcoin',
  'ethtrader',
];

// Keywords that indicate airdrop/giveaway posts
const AIRDROP_KEYWORDS = [
  'airdrop', 'claim', 'eligibility', 'snapshot', 'token distribution',
  'retroactive', 'rewards', 'points', 'season', 'allocation',
  'giveaway', 'free', 'claim now', 'drop your', 'comment your',
];

// Keywords for "drop your address" posts
const ADDRESS_DROP_KEYWORDS = [
  'drop your', 'comment your', 'leave your', 'post your',
  'address below', 'wallet address', 'solana address', 'eth address',
  'base address', 'arbitrum address', 'optimism address',
  'claim in comments', 'comment to claim', 'drop address',
  'sending to commenters', 'first 100', 'first 50', 'first 1000',
  'random commenters', 'giveaway to commenters',
];

// Scam indicators to filter out
const SCAM_INDICATORS = [
  'send eth first', 'send sol first', 'private key', 'seed phrase',
  'dm me', 'direct message', 'send 1 get 2', 'double your',
  'verify wallet', 'connect wallet http', 'bit.ly', 'tinyurl',
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
  link_flair_text?: string;
}

export async function scrapeReddit(options?: { limit?: number; onProgress?: (current: number, total: number, subreddit: string) => void }): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 100;
  
  console.log(`[Reddit Scraper] Starting scan of ${SUBREDDITS.length} subreddits`);
  
  const totalSubreddits = SUBREDDITS.length;
  let completedSubreddits = 0;
  
  for (const subreddit of SUBREDDITS) {
    try {
      if (options?.onProgress) {
        options.onProgress(completedSubreddits, totalSubreddits, `r/${subreddit}`);
      }
      
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
      
      const posts = await fetchSubredditPosts(subreddit);
      
      for (const post of posts) {
        const analysis = analyzeRedditPost(post);
        if (analysis && analysis.score >= 0.4) {
          const airdrop = createAirdropFromPost(post, analysis);
          if (airdrop) results.push(airdrop);
        }
        if (results.length >= limit) break;
      }
      
      completedSubreddits++;
      
      if (results.length >= limit) break;
    } catch (error) {
      errors.push(`r/${subreddit}: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSubreddits++;
    }
  }
  
  // Sort by score and recency
  results.sort((a, b) => {
    const scoreA = (a as any).engagement || 0;
    const scoreB = (b as any).engagement || 0;
    return scoreB - scoreA;
  });
  
  console.log(`[Reddit Scraper] Found ${results.length} potential airdrops`);
  
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
      link_flair_text: child.data.link_flair_text,
    }));
  } catch {
    return [];
  }
}

function analyzeRedditPost(post: RedditPost): { score: number; keywords: string[]; signals: string[]; engagement: number; isAddressDrop: boolean } | null {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  let isAddressDrop = false;
  
  // Check for scam indicators first
  for (const indicator of SCAM_INDICATORS) {
    if (text.includes(indicator)) {
      return null; // Hard filter scams
    }
  }
  
  // Check for "drop your address" posts
  for (const keyword of ADDRESS_DROP_KEYWORDS) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
      score += 0.8; // High score for these
      isAddressDrop = true;
      signals.push('address_drop_giveaway');
    }
  }
  
  // Check for general airdrop keywords
  for (const keyword of AIRDROP_KEYWORDS) {
    if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
      score += keyword === 'airdrop' || keyword === 'giveaway' ? 1.0 : 0.4;
    }
  }
  
  // Engagement scoring
  const engagement = post.score + (post.num_comments * 2);
  if (engagement > 500) {
    score += 0.3;
    signals.push('high_engagement');
  } else if (engagement > 100) {
    score += 0.15;
  } else if (engagement > 50) {
    score += 0.1;
  }
  
  // Recency bonus (more aggressive for Reddit)
  const hoursOld = (Date.now() / 1000 - post.created_utc) / 3600;
  if (hoursOld < 6) score += 0.3;
  else if (hoursOld < 24) score += 0.2;
  else if (hoursOld < 72) score += 0.1;
  else if (hoursOld > 168) score -= 0.3;
  
  // Subreddit bonus
  const trustedSubreddits = ['CryptoAirdrops', 'solanagiveaways', 'solana', 'ethereum', 'CryptoCurrency'];
  if (trustedSubreddits.includes(post.subreddit)) {
    score += 0.15;
    signals.push('trusted_subreddit');
  }
  
  // Flair bonus
  const airdropFlairs = ['airdrop', 'giveaway', 'free', 'rewards', 'claim'];
  if (post.link_flair_text && airdropFlairs.some(f => post.link_flair_text?.toLowerCase().includes(f))) {
    score += 0.2;
    signals.push('airdrop_flair');
  }
  
  // Comment count bonus (active giveaways have many comments)
  if (post.num_comments > 100) {
    score += 0.2;
    signals.push('many_claimants');
  } else if (post.num_comments > 50) {
    score += 0.1;
  }
  
  score = Math.min(Math.max(score, 0), 1.5); // Can exceed 1.0 with bonuses
  
  if (foundKeywords.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals, engagement, isAddressDrop };
}

function createAirdropFromPost(post: RedditPost, analysis: any): Partial<Airdrop> | null {
  // Skip if too risky
  if (analysis.signals.includes('potential_scam')) return null;
  
  const projectName = extractProjectName(post.title);
  const isAddressDrop = analysis.isAddressDrop;
  
  return {
    id: `reddit-${post.subreddit}-${post.id}`,
    name: projectName,
    symbol: deriveSymbol(projectName),
    description: sanitizeText(post.selftext || post.title, 500),
    website: `https://reddit.com${post.permalink}`,
    twitter: extractTwitterHandle(post.selftext),
    discord: extractDiscordInvite(post.selftext),
    telegram: extractTelegramLink(post.selftext),
    chains: inferChainFromSubreddit(post.subreddit),
    primaryChain: inferChainFromSubreddit(post.subreddit)[0],
    categories: categorizeBySubreddit(post.subreddit),
    status: isAddressDrop ? 'live' : (analysis.signals.includes('high_engagement') ? 'live' : 'unverified'),
    verified: analysis.score > 0.9 && !analysis.signals.includes('potential_scam'),
    featured: analysis.score > 1.0,
    frictionLevel: isAddressDrop ? 'low' : 'medium',
    claimType: isAddressDrop ? 'off-chain' : 'mixed',
    claimUrl: `https://reddit.com${post.permalink}`,
    estimatedValueUSD: estimateValue(analysis.score, analysis.engagement, isAddressDrop),
    sources: [{
      type: 'reddit',
      url: `https://reddit.com${post.permalink}`,
      fetchedAt: new Date(),
      confidence: Math.min(analysis.score, 1),
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    communityScore: analysis.engagement,
    requirements: isAddressDrop ? ['Comment wallet address on Reddit post'] : extractRequirements(post.selftext),
    notes: `Reddit giveaway from r/${post.subreddit}. ${analysis.signals.join(', ')}.`,
  } as Partial<Airdrop>;
}

// Utilities
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractProjectName(title: string): string {
  // Try to extract project name
  const patterns = [
    /([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)*)\s*(?:Airdrop|Giveaway|Claim|Free)/i,
    /^([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)*)/i,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  return title.split(' ').slice(0, 3).join(' ');
}

function deriveSymbol(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 5);
}

function sanitizeText(text: string, max: number): string {
  return text
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/u\/[a-zA-Z0-9_-]+/g, '[Reddit User]')
    .trim()
    .slice(0, max) + (text.length > max ? '...' : '');
}

function extractTwitterHandle(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/@(twitter\.com\/)?([a-zA-Z0-9_]{3,20})/);
  return match ? match[2] : undefined;
}

function extractDiscordInvite(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/discord\.gg\/([a-zA-Z0-9]+)/);
  return match ? `https://discord.gg/${match[1]}` : undefined;
}

function extractTelegramLink(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/t\.me\/([a-zA-Z0-9_]+)/);
  return match ? `https://t.me/${match[1]}` : undefined;
}

function inferChainFromSubreddit(subreddit: string): string[] {
  const mapping: Record<string, string[]> = {
    'solana': ['Solana'],
    'solanagiveaways': ['Solana'],
    'ethereum': ['Ethereum'],
    'ethtrader': ['Ethereum'],
    'base': ['Base'],
    'arbitrum': ['Arbitrum'],
    'optimism': ['Optimism'],
    'zksync': ['zkSync'],
    'Starknet': ['Starknet'],
    'sui': ['Sui'],
    'aptos': ['Aptos'],
    'CosmosNetwork': ['Cosmos'],
    'polkadot': ['Polkadot'],
    'layerzero': ['Bridges'],
  };
  return mapping[subreddit] || ['Multi-chain'];
}

function categorizeBySubreddit(subreddit: string): string[] {
  const mapping: Record<string, string[]> = {
    'solana': ['DeFi', 'Infrastructure'],
    'solanagiveaways': ['DeFi'],
    'ethereum': ['DeFi', 'Layer 2'],
    'ethtrader': ['DeFi'],
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
    'CryptoAirdrops': ['DeFi'],
    'CryptoCurrency': ['DeFi'],
    'CryptoMoonShots': ['DeFi'],
    'altcoin': ['DeFi'],
  };
  return mapping[subreddit] || ['DeFi'];
}

function estimateValue(score: number, engagement: number, isAddressDrop: boolean): number | undefined {
  if (isAddressDrop) {
    // Address drop giveaways are usually smaller
    return Math.min(50, Math.round(engagement / 10));
  }
  let value = 150;
  value *= (0.5 + score * 0.5);
  if (engagement > 1000) value *= 1.5;
  else if (engagement > 500) value *= 1.2;
  return Math.round(value);
}

function extractRequirements(selftext: string): string[] {
  const requirements: string[] = [];
  if (!selftext) return requirements;
  
  const text = selftext.toLowerCase();
  
  if (text.includes('follow')) requirements.push('Follow on Twitter');
  if (text.includes('retweet')) requirements.push('Retweet announcement');
  if (text.includes('join') && text.includes('telegram')) requirements.push('Join Telegram');
  if (text.includes('join') && text.includes('discord')) requirements.push('Join Discord');
  if (text.includes('comment')) requirements.push('Comment on post');
  if (text.includes('drop address')) requirements.push('Drop wallet address');
  if (text.includes('wallet connected')) requirements.push('Connect wallet');
  
  return requirements;
}
