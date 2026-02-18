// Scraper Orchestrator - Updated to accept API keys from request

import { scrapeGitHub } from "./github-scraper";
import { scrapeRSSFeeds } from "./rss-scraper";
import { scrapeTwitter } from "./twitter-scraper";
import { Airdrop, DiscoveryResult } from "@/lib/types/airdrop";
import { saveAirdrop, getAirdropById, getAllAirdrops } from "@/lib/data/airdrop-store";

export interface ScraperOptions {
  sources?: ("github" | "rss" | "twitter")[];
  limit?: number;
  minConfidence?: number;
  // API keys from cookies/request
  githubToken?: string;
  twitterBearerToken?: string;
}

export interface ScraperResult {
  success: boolean;
  newAirdrops: Airdrop[];
  updatedAirdrops: Airdrop[];
  totalDiscovered: number;
  errors: string[];
  sources: {
    github?: DiscoveryResult;
    rss?: DiscoveryResult;
    twitter?: DiscoveryResult;
  };
  scrapedAt: Date;
}

export async function runScraper(options?: ScraperOptions): Promise<ScraperResult> {
  const sources = options?.sources || ["github", "rss", "twitter"];
  const limit = options?.limit || 50;
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
  
  console.log(`Starting airdrop scraper at ${results.scrapedAt.toISOString()}`);
  
  const scraperPromises: Promise<DiscoveryResult | null>[] = [];
  
  if (sources.includes("github")) {
    scraperPromises.push(
      scrapeGitHub({ limit: Math.ceil(limit / 2), githubToken: options?.githubToken })
        .catch(err => ({ success: false, airdrops: [], errors: [`GitHub: ${err.message}`], source: "github", scrapedAt: new Date() }))
    );
  }
  
  if (sources.includes("rss")) {
    scraperPromises.push(
      scrapeRSSFeeds({ limit: Math.ceil(limit / 2) })
        .catch(err => ({ success: false, airdrops: [], errors: [`RSS: ${err.message}`], source: "rss", scrapedAt: new Date() }))
    );
  }
  
  if (sources.includes("twitter")) {
    scraperPromises.push(
      scrapeTwitter({ limit: Math.ceil(limit / 2), twitterBearerToken: options?.twitterBearerToken })
        .catch(err => ({ success: false, airdrops: [], errors: [`Twitter: ${err.message}`], source: "twitter", scrapedAt: new Date() }))
    );
  }
  
  const scraperResults = await Promise.all(scraperPromises);
  const allDiscovered: Partial<Airdrop>[] = [];
  
  for (const result of scraperResults) {
    if (!result) continue;
    results.totalDiscovered += result.airdrops.length;
    results.errors.push(...(result.errors || []));
    
    if (result.source === "github") results.sources.github = result;
    else if (result.source === "rss") results.sources.rss = result;
    else if (result.source === "twitter") results.sources.twitter = result;
    
    for (const airdrop of result.airdrops) {
      const sourceConfidence = airdrop.sources?.[0]?.confidence || 0;
      if (sourceConfidence >= minConfidence) allDiscovered.push(airdrop);
    }
  }
  
  const processed = await deduplicateAndMerge(allDiscovered);
  
  for (const airdrop of processed.new) {
    try { await saveAirdrop(airdrop); results.newAirdrops.push(airdrop); }
    catch (error) { results.errors.push(`Failed to save ${airdrop.name}`); }
  }
  
  for (const airdrop of processed.updated) {
    try { await saveAirdrop(airdrop); results.updatedAirdrops.push(airdrop); }
    catch (error) { results.errors.push(`Failed to update ${airdrop.name}`); }
  }
  
  results.success = results.newAirdrops.length > 0 || results.updatedAirdrops.length > 0;
  console.log(`Scraper completed: ${results.newAirdrops.length} new, ${results.updatedAirdrops.length} updated`);
  
  return results;
}

async function deduplicateAndMerge(discovered: Partial<Airdrop>[]): Promise<{ new: Airdrop[]; updated: Airdrop[] }> {
  const newAirdrops: Airdrop[] = [];
  const updatedAirdrops: Airdrop[] = [];
  const existingAirdrops = await getAllAirdrops();
  const existingByName = new Map<string, Airdrop>();
  const existingByUrl = new Map<string, Airdrop>();
  
  for (const existing of existingAirdrops) {
    existingByName.set(existing.name.toLowerCase(), existing);
    if (existing.website) existingByUrl.set(normalizeUrl(existing.website), existing);
  }
  
  for (const item of discovered) {
    const id = generateAirdropId(item.name || "unknown");
    const existingByNameMatch = existingByName.get((item.name || "").toLowerCase());
    const existingByUrlMatch = item.website ? existingByUrl.get(normalizeUrl(item.website)) : null;
    const existing = existingByNameMatch || existingByUrlMatch;
    
    if (existing) {
      updatedAirdrops.push(mergeAirdrops(existing, item));
    } else {
      newAirdrops.push({
        id,
        name: item.name || "Unknown",
        symbol: item.symbol || deriveSymbol(item.name || "Unknown"),
        description: item.description || "",
        website: item.website || "",
        twitter: item.twitter,
        blog: item.blog,
        claimUrl: item.claimUrl,
        claimType: item.claimType || "mixed",
        categories: item.categories || ["DeFi"],
        frictionLevel: item.frictionLevel || "medium",
        rules: item.rules || {},
        status: item.status || "unverified",
        verified: item.verified || false,
        featured: item.featured || false,
        sources: item.sources || [],
        discoveredAt: item.discoveredAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedValueUSD: item.estimatedValueUSD,
        estimatedValueRange: item.estimatedValueRange,
      } as Airdrop);
    }
  }
  
  return { new: newAirdrops, updated: updatedAirdrops };
}

function mergeAirdrops(existing: Airdrop, newItem: Partial<Airdrop>): Airdrop {
  const existingSources = new Set(existing.sources.map(s => s.url));
  const newSources = (newItem.sources || []).filter(s => !existingSources.has(s.url));
  
  return {
    ...existing,
    description: newItem.description || existing.description,
    website: newItem.website || existing.website,
    twitter: newItem.twitter || existing.twitter,
    claimUrl: newItem.claimUrl || existing.claimUrl,
    claimType: newItem.claimType || existing.claimType,
    categories: newItem.categories || existing.categories,
    frictionLevel: newItem.frictionLevel || existing.frictionLevel,
    status: newItem.status === "live" ? "live" : existing.status,
    verified: newItem.verified || existing.verified,
    featured: newItem.featured || existing.featured,
    estimatedValueUSD: newItem.estimatedValueUSD || existing.estimatedValueUSD,
    sources: [...existing.sources, ...newSources],
    discoveredAt: newItem.discoveredAt || existing.discoveredAt,
    updatedAt: new Date(),
    lastVerifiedAt: newItem.verified ? new Date() : existing.lastVerifiedAt,
  };
}

function generateAirdropId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeUrl(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url.toLowerCase(); }
}

function deriveSymbol(name: string): string {
  return name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, "");
}

export { scrapeGitHub, scrapeRSSFeeds, scrapeTwitter };
