// POST /api/scraper/run - ALL airdrops go through Gemini AI
// Returns discovered airdrops directly in response

import { NextRequest, NextResponse } from "next/server";
import { strictRateLimit } from "@/lib/middleware/rate-limit";
import { runScraper } from "@/lib/scraper";
import { getAllAirdrops, saveAirdrop } from "@/lib/data/airdrop-store";
import { enrichAirdropWithGemini } from "@/lib/ai/gemini-enricher";

let lastRunInfo: { success: boolean; timestamp: Date; newAirdrops: number; updatedAirdrops: number; errors: string[] } | null = null;

// POST - Run scraper with mandatory AI enrichment for ALL airdrops
export async function POST(request: NextRequest) {
  // Apply strict rate limiting
  const rateLimitResponse = strictRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Check for admin token
  const authHeader = request.headers.get("authorization");
  const adminToken = request.cookies.get("api_admin_token")?.value || process.env.ADMIN_TOKEN;
  
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json().catch(() => ({}));
    const { sources, limit } = body;
    
    // Get API keys from cookies
    const githubToken = request.cookies.get("api_github_token")?.value;
    const twitterBearerToken = request.cookies.get("api_twitter_token")?.value;
    const geminiApiKey = request.cookies.get("api_gemini_key")?.value;
    
    console.log(`[Scraper API] Starting comprehensive scan`);
    console.log(`[Scraper API] Gemini AI enrichment: ${!!geminiApiKey}`);
    
    // Run the scraper
    const result = await runScraper({
      sources: sources || ["github", "rss", "twitter", "web-search", "reddit"],
      limit: limit || 200,
      githubToken,
      twitterBearerToken,
      onProgress: (stage, percent, total, item) => {
        console.log(`[Scraper API] ${stage} - ${percent}% (${item || ''})`);
      },
    });
    
    // AI Enrichment - ALL airdrops go through Gemini
    let enrichedCount = 0;
    let failedEnrichment = 0;
    
    if (geminiApiKey) {
      console.log(`[Scraper API] Running AI enrichment on ${result.newAirdrops.length} airdrops`);
      
      for (const airdrop of result.newAirdrops) {
        try {
          // Build content from all available sources
          const content = buildContentForEnrichment(airdrop);
          
          const enrichment = await enrichAirdropWithGemini(content, geminiApiKey);
          
          if (enrichment.success && enrichment.data) {
            // Apply AI enrichment
            if (enrichment.data.name) airdrop.name = enrichment.data.name;
            if (enrichment.data.symbol) airdrop.symbol = enrichment.data.symbol;
            if (enrichment.data.description) airdrop.description = enrichment.data.description;
            if (enrichment.data.website) airdrop.website = enrichment.data.website;
            if (enrichment.data.twitter) airdrop.twitter = enrichment.data.twitter;
            if (enrichment.data.discord) airdrop.discord = enrichment.data.discord;
            if (enrichment.data.telegram) airdrop.telegram = enrichment.data.telegram;
            
            // Only keep ongoing airdrops
            if (enrichment.data.isOngoing && enrichment.data.confidence > 0.4) {
              airdrop.verified = enrichment.data.confidence > 0.7;
              enrichedCount++;
            } else {
              airdrop.status = "ended";
              failedEnrichment++;
            }
          } else {
            // Keep unenriched but mark as unverified
            airdrop.verified = false;
            failedEnrichment++;
          }
          
          // Rate limiting between AI calls
          await new Promise(resolve => setTimeout(resolve, 350));
        } catch (error) {
          console.error(`[Scraper API] AI enrichment failed for ${airdrop.name}:`, error);
          failedEnrichment++;
        }
      }
    }
    
    // Filter out ended airdrops
    const ongoingAirdrops = result.newAirdrops.filter(a => a.status !== "ended");
    
    // Save to store
    for (const airdrop of ongoingAirdrops) {
      try {
        await saveAirdrop(airdrop);
      } catch (error) {
        console.error(`[Scraper API] Failed to save ${airdrop.name}:`, error);
      }
    }
    
    lastRunInfo = {
      success: result.success,
      timestamp: result.scrapedAt,
      newAirdrops: ongoingAirdrops.length,
      updatedAirdrops: result.updatedAirdrops.length,
      errors: result.errors,
    };
    
    // Return the actual airdrops in the response
    return NextResponse.json({
      success: true,
      data: {
        newAirdrops: ongoingAirdrops.length,
        updatedAirdrops: result.updatedAirdrops.length,
        enrichedWithAI: enrichedCount,
        failedEnrichment,
        totalDiscovered: result.totalDiscovered,
        filteredOut: result.newAirdrops.length - ongoingAirdrops.length,
        errors: result.errors,
        sources: result.sources,
        // Include the actual airdrops so frontend can display them immediately
        airdrops: ongoingAirdrops.map(a => ({
          id: a.id,
          name: a.name,
          symbol: a.symbol,
          description: a.description,
          website: a.website,
          twitter: a.twitter,
          discord: a.discord,
          telegram: a.telegram,
          claimUrl: a.claimUrl,
          claimType: a.claimType,
          categories: a.categories,
          frictionLevel: a.frictionLevel,
          verified: a.verified,
          featured: a.featured,
          status: a.status,
          chains: a.chains,
          primaryChain: a.primaryChain,
          estimatedValueUSD: a.estimatedValueUSD,
          discoveredAt: a.discoveredAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("[Scraper API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Scraper failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Build rich content for Gemini enrichment from all available sources
function buildContentForEnrichment(airdrop: any): string {
  const parts: string[] = [];
  
  // Add description
  if (airdrop.description) parts.push(`<description>${airdrop.description}</description>`);
  
  // Add website
  if (airdrop.website) parts.push(`<website>${airdrop.website}</website>`);
  
  // Add sources
  if (airdrop.sources && airdrop.sources.length > 0) {
    for (const source of airdrop.sources) {
      parts.push(`<source type="${source.type}" url="${source.url}">${source.type} announcement</source>`);
    }
  }
  
  // Add requirements
  if (airdrop.requirements && airdrop.requirements.length > 0) {
    parts.push(`<requirements>${airdrop.requirements.join('; ')}</requirements>`);
  }
  
  // Add notes
  if (airdrop.notes) parts.push(`<notes>${airdrop.notes}</notes>`);
  
  return parts.join('\n');
}

// GET - Get scraper status
export async function GET() {
  try {
    const allAirdrops = await getAllAirdrops();
    const liveAirdrops = allAirdrops.filter(a => a.status === "live" || a.status === "unverified");
    const verifiedAirdrops = allAirdrops.filter(a => a.verified);
    
    return NextResponse.json({
      success: true,
      data: {
        lastRun: lastRunInfo,
        stats: {
          totalAirdrops: allAirdrops.length,
          liveAirdrops: liveAirdrops.length,
          verifiedAirdrops: verifiedAirdrops.length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get status" }, { status: 500 });
  }
}
