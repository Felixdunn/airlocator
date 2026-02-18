// Main Scraper Orchestrator - Coordinates ALL scraping sources
// GitHub, RSS, Twitter, Web Search, Reddit

import { scrapeGitHub } from "./github-scraper";
import { scrapeRSSFeeds } from "./rss-scraper";
import { scrapeTwitter } from "./twitter-scraper";
import { scrapeWebSearch } from "./web-search-scraper";
import { scrapeReddit } from "./reddit-scraper";
import { Airdrop, DiscoveryResult } from "@/lib/types/airdrop";
import { saveAirdrop, getAllAirdrops } from "@/lib/data/airdrop-store";
import { enrichAirdropWithGemini } from "@/lib/ai/gemini-enricher";

export interface ScraperOptions {
  sources?: ("github" | "rss" | "twitter" | "web-search" | "reddit")[];
  limit?: number;
  minConfidence?: number;
  githubToken?: string;
  twitterBearerToken?: string;
  geminiApiKey?: string;
  searchApiKey?: string;
  onProgress?: (stage: string, percent: number, total: number, currentItem?: string) => void;
}

export interface ScraperResult {
  success: boolean;
  newAirdrops: Airdrop[];
  updatedAirdrops: Airdrop[];
  totalDiscovered: number;
  errors: string[];
  sources: Record<string, number>;
  scrapedAt: Date;
}

export async function runScraper(options?: ScraperOptions): Promise<ScraperResult> {
  const sources = options?.sources || ["github", "rss", "twitter", "web-search", "reddit"];
  const limit = options?.limit || 150;
  const minConfidence = options?.minConfidence || 0.5;
  
  const results: ScraperResult = {
    success: false,
    newAirdrops: [],
    updatedAirdrops: [],
    totalDiscovered: 0,
    errors: [],
    sources: {},
    scrapedAt: new Date(),
  };
  
  const totalSources = sources.length;
  let completedSources = 0;
  
  const updateProgress = (stage: string, currentItem?: string) => {
    const percent = Math.round((completedSources / totalSources) * 100);
    options?.onProgress?.(stage, percent, 100, currentItem);
  };
  
  console.log(`[Orchestrator] Starting comprehensive scrape with ${sources.length} sources`);
  
  // 1. GitHub scraping
  if (sources.includes("github")) {
    updateProgress('Scanning GitHub repositories...', 'GitHub');
    try {
      const githubResult = await scrapeGitHub({
        limit: Math.ceil(limit * 0.4),
        githubToken: options?.githubToken,
        onProgress: (stage, current, total, item) => {
          updateProgress(`GitHub: ${stage}`, item);
        },
      });
      results.sources.github = githubResult.airdrops.length;
      results.totalDiscovered += githubResult.airdrops.length;
      results.errors.push(...githubResult.errors);
      completedSources++;
    } catch (error) {
      results.errors.push(`GitHub: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
  }
  
  // 2. RSS scraping
  if (sources.includes("rss")) {
    updateProgress('Scanning protocol blogs (RSS)...', 'RSS');
    try {
      const rssResult = await scrapeRSSFeeds({ limit: Math.ceil(limit * 0.2) });
      results.sources.rss = rssResult.airdrops.length;
      results.totalDiscovered += rssResult.airdrops.length;
      results.errors.push(...rssResult.errors);
      completedSources++;
    } catch (error) {
      results.errors.push(`RSS: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
  }
  
  // 3. Twitter scraping
  if (sources.includes("twitter")) {
    updateProgress('Scanning Twitter announcements...', 'Twitter');
    try {
      const twitterResult = await scrapeTwitter({
        limit: Math.ceil(limit * 0.2),
        twitterBearerToken: options?.twitterBearerToken,
      });
      results.sources.twitter = twitterResult.airdrops.length;
      results.totalDiscovered += twitterResult.airdrops.length;
      results.errors.push(...twitterResult.errors);
      completedSources++;
    } catch (error) {
      results.errors.push(`Twitter: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
  }
  
  // 4. Web Search scraping
  if (sources.includes("web-search")) {
    updateProgress('Searching web for airdrops...', 'Web Search');
    try {
      const webResult = await scrapeWebSearch({
        limit: Math.ceil(limit * 0.15),
        searchApiKey: options?.searchApiKey,
      });
      results.sources['web-search'] = webResult.airdrops.length;
      results.totalDiscovered += webResult.airdrops.length;
      results.errors.push(...webResult.errors);
      completedSources++;
    } catch (error) {
      results.errors.push(`Web Search: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
  }
  
  // 5. Reddit scraping
  if (sources.includes("reddit")) {
    updateProgress('Scanning Reddit discussions...', 'Reddit');
    try {
      const redditResult = await scrapeReddit({ limit: Math.ceil(limit * 0.15) });
      results.sources.reddit = redditResult.airdrops.length;
      results.totalDiscovered += redditResult.airdrops.length;
      results.errors.push(...redditResult.errors);
      completedSources++;
    } catch (error) {
      results.errors.push(`Reddit: ${error instanceof Error ? error.message : 'Unknown'}`);
      completedSources++;
    }
  }
  
  updateProgress('Deduplicating and merging results...', 'Processing');
  
  // Deduplicate and merge
  const allDiscovered = await deduplicateAndMerge([
    ...(await scrapeGitHub({ limit: 50, githubToken: options?.githubToken })).airdrops,
    ...(await scrapeRSSFeeds({ limit: 30 })).airdrops,
    ...(await scrapeTwitter({ limit: 30, twitterBearerToken: options?.twitterBearerToken })).airdrops,
    ...(await scrapeWebSearch({ limit: 30, searchApiKey: options?.searchApiKey })).airdrops,
    ...(await scrapeReddit({ limit: 30 })).airdrops,
  ]);
  
  // AI Enrichment
  let enrichedCount = 0;
  if (options?.geminiApiKey) {
    updateProgress('AI enrichment with Gemini...', 'AI');
    for (const airdrop of allDiscovered.new) {
      try {
        const content = `${airdrop.name} ${airdrop.description}`;
        const enrichment = await enrichAirdropWithGemini(content, options.geminiApiKey);
        
        if (enrichment.success && enrichment.data) {
          if (enrichment.data.isOngoing && enrichment.data.confidence > 0.5) {
            airdrop.name = enrichment.data.name;
            airdrop.symbol = enrichment.data.symbol;
            airdrop.description = enrichment.data.description;
            airdrop.website = enrichment.data.website || airdrop.website;
            airdrop.twitter = enrichment.data.twitter || airdrop.twitter;
            enrichedCount++;
          } else {
            airdrop.status = "ended";
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {}
    }
  }
  
  // Filter ended airdrops
  const ongoingAirdrops = allDiscovered.new.filter(a => a.status !== "ended");
  
  // Save to store
  for (const airdrop of ongoingAirdrops) {
    try {
      await saveAirdrop(airdrop);
      results.newAirdrops.push(airdrop);
    } catch {}
  }
  
  for (const airdrop of allDiscovered.updated) {
    try {
      await saveAirdrop(airdrop);
      results.updatedAirdrops.push(airdrop);
    } catch {}
  }
  
  results.success = results.newAirdrops.length > 0;
  
  console.log(`[Orchestrator] Complete: ${results.newAirdrops.length} new, ${results.updatedAirdrops.length} updated, ${enrichedCount} AI enriched`);
  
  return results;
}

async function deduplicateAndMerge(discovered: Partial<Airdrop>[]): Promise<{ new: Airdrop[]; updated: Airdrop[] }> {
  const newAirdrops: Airdrop[] = [];
  const updatedAirdrops: Airdrop[] = [];
  const existing = await getAllAirdrops();
  const existingByName = new Map(existing.map(a => [a.name.toLowerCase(), a]));
  
  for (const item of discovered) {
    const id = item.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `airdrop-${Date.now()}`;
    const existingMatch = existingByName.get(id);
    
    if (existingMatch) {
      updatedAirdrops.push({ ...existingMatch, ...item, updatedAt: new Date() } as Airdrop);
    } else {
      newAirdrops.push({
        id,
        name: item.name || "Unknown",
        symbol: item.symbol || "UNK",
        description: item.description || "",
        website: item.website || "",
        chains: item.chains || ["Solana"],
        primaryChain: item.primaryChain || "Solana",
        categories: item.categories || ["DeFi"],
        frictionLevel: item.frictionLevel || "medium",
        claimType: item.claimType || "mixed",
        status: item.status || "unverified",
        verified: item.verified || false,
        featured: item.featured || false,
        sources: item.sources || [],
        discoveredAt: item.discoveredAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedValueUSD: item.estimatedValueUSD,
      } as Airdrop);
    }
  }
  
  return { new: newAirdrops, updated: updatedAirdrops };
}

export { scrapeGitHub, scrapeRSSFeeds, scrapeTwitter, scrapeWebSearch, scrapeReddit };
