// Enhanced Web Search Scraper - More aggressive search for airdrops
// Searches Google, CryptoPanic, and multiple sources

import { DiscoveryResult, Airdrop } from "@/lib/types/airdrop";

const CONFIG = {
  TIMEOUT: 15000,
  MAX_RETRIES: 2,
  DELAY_BETWEEN_SEARCHES: 1000,
};

// More aggressive search queries
const SEARCH_QUERIES = [
  "solana airdrop claim 2025",
  "ethereum airdrop eligibility",
  "new crypto airdrop announced",
  "layer 2 airdrop snapshot",
  "defi protocol token distribution",
  "nft project airdrop",
  "gaming crypto airdrop",
  "testnet rewards airdrop",
  "retroactive airdrop claim",
  "crypto airdrop live now",
  "base network airdrop",
  "arbitrum airdrop season",
  "optimism airdrop eligibility",
  "zkSync airdrop claim",
  "starknet airdrop distribution",
  "linea airdrop campaign",
  "scroll airdrop points",
  "sui airdrop claim",
  "aptos airdrop rewards",
  "cosmos airdrop 2025",
  "polkadot airdrop claim",
  "avalanche airdrop",
  "polygon airdrop",
  "bnb airdrop",
  "crypto giveaway drop address",
  "free crypto airdrop",
  "airdrop comment your address",
  "reddit crypto giveaway",
];

// Airdrop aggregator sites
const AIRDROP_AGGREGATORS = [
  { name: "Airdrops.io", url: "https://airdrops.io", type: "aggregator" },
  { name: "Airdrop Alert", url: "https://airdropalert.com", type: "aggregator" },
  { name: "CoinMarketCap Airdrops", url: "https://coinmarketcap.com/airdrop", type: "aggregator" },
  { name: "CoinGecko Airdrops", url: "https://coingecko.com/airdrops", type: "aggregator" },
  { name: "DefiLlama Airdrops", url: "https://defillama.com/airdrops", type: "aggregator" },
  { name: "99Airdrops", url: "https://99airdrops.com", type: "aggregator" },
];

// Crypto news sites with RSS
const CRYPTO_NEWS_SITES = [
  { name: "CoinDesk", rss: "https://coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", rss: "https://cointelegraph.com/rss" },
  { name: "The Block", rss: "https://theblock.co/rss.xml" },
  { name: "Decrypt", rss: "https://decrypt.co/feed" },
  { name: "Blockworks", rss: "https://blockworks.co/news/feed" },
  { name: "CryptoSlate", rss: "https://cryptoslate.com/feed/" },
];

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: Date;
}

export async function scrapeWebSearch(options?: { 
  limit?: number;
  searchApiKey?: string;
  onProgress?: (current: number, total: number, source: string) => void;
}): Promise<DiscoveryResult> {
  const results: Partial<Airdrop>[] = [];
  const errors: string[] = [];
  const limit = options?.limit || 100;
  
  console.log(`[Web Search Scraper] Starting comprehensive web search`);
  
  let totalSources = SEARCH_QUERIES.length + AIRDROP_AGGREGATORS.length + CRYPTO_NEWS_SITES.length;
  let completedSources = 0;
  
  // Search using multiple queries
  for (const query of SEARCH_QUERIES.slice(0, 15)) {
    try {
      if (options?.onProgress) {
        options.onProgress(completedSources, totalSources, `Search: ${query.slice(0, 30)}...`);
      }
      
      await sleep(CONFIG.DELAY_BETWEEN_SEARCHES);
      
      const searchResults = await performWebSearch(query, options?.searchApiKey);
      
      for (const result of searchResults.slice(0, 5)) {
        const analysis = analyzeSearchResult(result);
        if (analysis && analysis.score >= 0.45) {
          results.push(createAirdropFromSearchResult(result, analysis));
        }
      }
      
      completedSources++;
      
      if (results.length >= limit) break;
    } catch (error) {
      errors.push(`Search "${query}": ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
  }
  
  // Scrape airdrop aggregator sites
  for (const aggregator of AIRDROP_AGGREGATORS) {
    try {
      if (options?.onProgress) {
        options.onProgress(completedSources, totalSources, aggregator.name);
      }
      
      await sleep(500);
      const aggregatorResults = await scrapeAirdropAggregator(aggregator);
      results.push(...aggregatorResults);
      completedSources++;
    } catch (error) {
      errors.push(`${aggregator.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
    if (results.length >= limit) break;
  }
  
  // Scrape crypto news RSS feeds
  for (const newsSite of CRYPTO_NEWS_SITES) {
    try {
      if (options?.onProgress) {
        options.onProgress(completedSources, totalSources, newsSite.name);
      }
      
      await sleep(500);
      const newsResults = await scrapeCryptoNewsRSS(newsSite);
      results.push(...newsResults);
      completedSources++;
    } catch (error) {
      errors.push(`${newsSite.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
    if (results.length >= limit) break;
  }
  
  // Sort by confidence and recency
  results.sort((a, b) => (b as any).score - (a as any).score);
  
  console.log(`[Web Search Scraper] Found ${results.length} potential airdrops`);
  
  return {
    success: results.length > 0,
    airdrops: results.slice(0, limit),
    errors,
    source: "web-search",
    scrapedAt: new Date(),
  };
}

async function performWebSearch(query: string, apiKey?: string): Promise<SearchResult[]> {
  if (apiKey) {
    return searchWithGoogleAPI(query, apiKey);
  }
  
  // Fallback: Use CryptoPanic API (free, no auth needed for basic)
  return searchWithCryptoPanic(query);
}

async function searchWithGoogleAPI(query: string, apiKey: string): Promise<SearchResult[]> {
  const searchEngineId = process.env.GOOGLE_CSE_ID || 'default';
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
  
  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'Google Search',
    }));
  } catch {
    return [];
  }
}

async function searchWithCryptoPanic(query: string): Promise<SearchResult[]> {
  // CryptoPanic has a free API
  const url = `https://cryptopanic.com/api/v1/posts/?auth_token=demo&filter=hot&kind=news`;
  
  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    return (data.results || [])
      .filter((item: any) => {
        const text = `${item.title} ${item.body}`.toLowerCase();
        return text.includes('airdrop') || text.includes('giveaway') || text.includes('claim');
      })
      .map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.body || '',
        source: item.source?.title || 'CryptoPanic',
        publishedAt: item.published_at ? new Date(item.published_at) : undefined,
      }));
  } catch {
    return [];
  }
}

async function scrapeAirdropAggregator(aggregator: typeof AIRDROP_AGGREGATORS[0]): Promise<Partial<Airdrop>[]> {
  const results: Partial<Airdrop>[] = [];
  
  // These sites often have public data we can reference
  // In production, you'd actually scrape these sites
  try {
    // For demo purposes, return placeholder
    // Real implementation would fetch and parse their HTML/APIs
  } catch {}
  
  return results;
}

async function scrapeCryptoNewsRSS(newsSite: { name: string; rss: string }): Promise<Partial<Airdrop>[]> {
  const results: Partial<Airdrop>[] = [];
  
  try {
    const response = await fetchWithRetry(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(newsSite.rss)}`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      for (const item of data.items.slice(0, 15)) {
        const text = `${item.title} ${item.description}`.toLowerCase();
        if (text.includes('airdrop') || text.includes('giveaway') || text.includes('token launch') || text.includes('claim')) {
          results.push({
            name: extractProjectName(item.title),
            symbol: deriveSymbol(item.title),
            description: sanitizeText(item.description || item.title, 500),
            website: item.link,
            categories: ['DeFi'],
            status: 'unverified' as const,
            verified: false,
            featured: false,
            frictionLevel: 'medium' as const,
            claimType: 'mixed' as const,
            sources: [{
              type: 'rss' as const,
              url: item.link,
              fetchedAt: new Date(),
              confidence: 0.55,
            }],
            discoveredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  } catch {}
  
  return results;
}

function analyzeSearchResult(result: SearchResult): { score: number; keywords: string[]; signals: string[] } | null {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  const foundKeywords: string[] = [];
  const signals: string[] = [];
  let score = 0;
  
  const keywords: Record<string, number> = {
    'airdrop': 1.0, 'claim': 0.8, 'eligibility': 0.7, 'snapshot': 0.8,
    'token distribution': 0.9, 'retroactive': 0.9, 'live': 0.6,
    'announced': 0.5, 'rewards': 0.6, 'points': 0.5, 'giveaway': 0.9,
  };
  
  for (const [kw, weight] of Object.entries(keywords)) {
    if (text.includes(kw)) {
      foundKeywords.push(kw);
      score += weight;
      if (weight >= 0.8) signals.push('high_confidence');
    }
  }
  
  // Recency bonus
  if (result.publishedAt) {
    const daysOld = (Date.now() - result.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 3) score += 0.3;
    else if (daysOld < 7) score += 0.2;
    else if (daysOld < 30) score += 0.1;
    else if (daysOld > 180) score -= 0.3;
  }
  
  // Source bonus
  const trustedSources = ['coindesk', 'cointelegraph', 'theblock', 'decrypt', 'coinmarketcap', 'coingecko'];
  if (trustedSources.some(s => result.source.toLowerCase().includes(s))) {
    score += 0.15;
    signals.push('trusted_source');
  }
  
  score = Math.min(Math.max(score, 0), 1.5);
  if (foundKeywords.length === 0) return null;
  
  return { score, keywords: foundKeywords, signals };
}

function createAirdropFromSearchResult(result: SearchResult, analysis: any): Partial<Airdrop> {
  return {
    name: extractProjectName(result.title),
    symbol: deriveSymbol(result.title),
    description: sanitizeText(result.snippet || result.title, 500),
    website: result.url,
    categories: ['DeFi'],
    status: analysis.signals.includes('high_confidence') ? 'live' : 'unverified',
    verified: analysis.score > 0.85,
    featured: analysis.score > 0.8,
    frictionLevel: 'medium' as const,
    claimType: 'mixed' as const,
    estimatedValueUSD: Math.round(150 * analysis.score),
    sources: [{
      type: 'web-search' as const,
      url: result.url,
      fetchedAt: new Date(),
      confidence: Math.min(analysis.score, 1),
    }],
    discoveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Utilities
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) return response;
    } catch {}
    await sleep(1000 * (i + 1));
  }
  throw new Error('Fetch failed');
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
