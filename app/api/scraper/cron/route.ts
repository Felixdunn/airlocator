// GET /api/scraper/cron - Vercel Cron endpoint
// Uses environment variables for API keys (set in Vercel dashboard)

import { NextResponse } from "next/server";
import { runScraper } from "@/lib/scraper";

export async function GET() {
  console.log("Cron scraper triggered at", new Date().toISOString());
  
  try {
    const result = await runScraper({
      sources: ["github", "rss", "twitter"],
      limit: 100,
      minConfidence: 0.55,
      // Use environment variables for cron (set in Vercel dashboard)
      githubToken: process.env.GITHUB_TOKEN,
      twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
    });
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        newAirdrops: result.newAirdrops.length,
        updatedAirdrops: result.updatedAirdrops.length,
        totalDiscovered: result.totalDiscovered,
        errors: result.errors.length,
      },
    });
  } catch (error) {
    console.error("Cron scraper failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
