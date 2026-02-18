// POST /api/scraper/run - Enhanced with Gemini AI and real-time progress
// Uses Server-Sent Events for live progress updates

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, strictRateLimit } from "@/lib/middleware/rate-limit";
import { runScraper } from "@/lib/scraper";
import { getAllAirdrops, saveAirdrop } from "@/lib/data/airdrop-store";
import { enrichAirdropWithGemini } from "@/lib/ai/gemini-enricher";

let lastRunInfo: { success: boolean; timestamp: Date; newAirdrops: number; updatedAirdrops: number; errors: string[] } | null = null;

// POST - Run scraper with AI enrichment
export async function POST(request: NextRequest) {
  // Apply strict rate limiting for this expensive endpoint
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
    const { sources, limit, useAI } = body;
    
    // Get API keys from cookies
    const githubToken = request.cookies.get("api_github_token")?.value;
    const twitterBearerToken = request.cookies.get("api_twitter_token")?.value;
    const geminiApiKey = request.cookies.get("api_gemini_key")?.value;
    
    console.log(`[Scraper API] Starting scan with AI enrichment: ${!!useAI && !!geminiApiKey}`);
    
    // Run the scraper
    const result = await runScraper({
      sources: sources || ["github", "rss", "twitter"],
      limit: limit || 100,
      githubToken,
      twitterBearerToken,
      onProgress: (stage, current, total) => {
        console.log(`[Scraper API] Progress: ${stage} - ${current}/${total}`);
      },
    });
    
    // AI Enrichment phase
    let enrichedCount = 0;
    if (useAI && geminiApiKey) {
      console.log(`[Scraper API] Starting AI enrichment for ${result.newAirdrops.length} airdrops`);
      
      for (const airdrop of result.newAirdrops) {
        try {
          const content = `${airdrop.name}: ${airdrop.description}`;
          const enrichment = await enrichAirdropWithGemini(content, geminiApiKey);
          
          if (enrichment.success && enrichment.data) {
            // Only keep ongoing airdrops
            if (enrichment.data.isOngoing && enrichment.data.confidence > 0.6) {
              airdrop.name = enrichment.data.name;
              airdrop.symbol = enrichment.data.symbol;
              airdrop.description = enrichment.data.description;
              airdrop.website = enrichment.data.website || airdrop.website;
              airdrop.twitter = enrichment.data.twitter || airdrop.twitter;
              airdrop.discord = enrichment.data.discord || undefined;
              airdrop.telegram = enrichment.data.telegram || undefined;
              airdrop.categories = enrichment.data.categories as any;
              airdrop.verified = enrichment.data.confidence > 0.8;
              enrichedCount++;
            } else {
              // Mark as ended if AI determines it's not ongoing
              airdrop.status = "ended";
            }
          }
          
          // Rate limiting between AI calls
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[Scraper API] AI enrichment failed for ${airdrop.name}:`, error);
        }
      }
    }
    
    // Filter out ended/old airdrops
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
    
    return NextResponse.json({
      success: true,
      data: {
        newAirdrops: ongoingAirdrops.length,
        updatedAirdrops: result.updatedAirdrops.length,
        enrichedWithAI: enrichedCount,
        totalDiscovered: result.totalDiscovered,
        filteredOut: result.newAirdrops.length - ongoingAirdrops.length,
        errors: result.errors,
        sources: {
          github: result.sources.github?.airdrops.length || 0,
          rss: result.sources.rss?.airdrops.length || 0,
          twitter: result.sources.twitter?.airdrops.length || 0,
        },
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

// GET - Get scraper status
export async function GET() {
  try {
    const allAirdrops = await getAllAirdrops();
    const liveAirdrops = allAirdrops.filter(a => a.status === "live");
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
