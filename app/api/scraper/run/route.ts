// POST /api/scraper/run - Manually trigger scraper (admin only)
// GET /api/scraper/status - Get scraper status and last run info

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { runScraper } from "@/lib/scraper";
import { getAllAirdrops } from "@/lib/data/airdrop-store";

// In-memory store for scraper status (use Redis in production)
let lastRunInfo: {
  success: boolean;
  timestamp: Date;
  newAirdrops: number;
  updatedAirdrops: number;
  errors: string[];
} | null = null;

// POST - Run scraper manually
export async function POST(request: NextRequest) {
  // Apply strict rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Check for admin token (in production, use proper auth)
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json().catch(() => ({}));
    const { sources, limit } = body;
    
    const result = await runScraper({
      sources: sources || ["github", "rss", "twitter"],
      limit: limit || 50,
    });
    
    // Store last run info
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
      { 
        success: false, 
        error: "Scraper failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
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
          unverifiedAirdrops: allAirdrops.filter(a => a.status === "unverified").length,
        },
        nextScheduledRun: getNextScheduledRun(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to get status",
      },
      { status: 500 }
    );
  }
}

function getNextScheduledRun(): string {
  // Calculate next cron run (every 6 hours)
  const now = new Date();
  const next = new Date(now);
  next.setHours(Math.floor(now.getHours() / 6) * 6 + 6);
  next.setMinutes(0);
  next.setSeconds(0);
  return next.toISOString();
}
