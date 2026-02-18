// POST /api/scraper/run - Updated to read API keys from cookies/headers

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { runScraper } from "@/lib/scraper";
import { getAllAirdrops } from "@/lib/data/airdrop-store";

let lastRunInfo: { success: boolean; timestamp: Date; newAirdrops: number; updatedAirdrops: number; errors: string[] } | null = null;

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Check for admin token (from cookie or header)
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
    
    const result = await runScraper({
      sources: sources || ["github", "rss", "twitter"],
      limit: limit || 50,
      githubToken,
      twitterBearerToken,
    });
    
    lastRunInfo = {
      success: result.success,
      timestamp: result.scrapedAt,
      newAirdrops: result.newAirdrops.length,
      updatedAirdrops: result.updatedAirdrops.length,
      errors: result.errors,
    };
    
    return NextResponse.json({
      success: true,
      data: {
        newAirdrops: result.newAirdrops.length,
        updatedAirdrops: result.updatedAirdrops.length,
        totalDiscovered: result.totalDiscovered,
        errors: result.errors,
        sources: {
          github: result.sources.github?.airdrops.length || 0,
          rss: result.sources.rss?.airdrops.length || 0,
          twitter: result.sources.twitter?.airdrops.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("Scraper error:", error);
    return NextResponse.json(
      { success: false, error: "Scraper failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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
          unverifiedAirdrops: allAirdrops.filter(a => a.status === "unverified").length,
        },
        nextScheduledRun: getNextScheduledRun(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get status" }, { status: 500 });
  }
}

function getNextScheduledRun(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(Math.floor(now.getHours() / 6) * 6 + 6);
  next.setMinutes(0);
  next.setSeconds(0);
  return next.toISOString();
}
