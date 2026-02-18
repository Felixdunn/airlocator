// GET /api/scraper/cron - Vercel Cron endpoint
// Automatically triggered every 6 hours by Vercel

import { NextResponse } from "next/server";
import { runScraper } from "@/lib/scraper";

export async function GET() {
  // Verify this is a Vercel cron request
  const authHeader = await import("next/headers").then(h => h.headers());
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, verify the Vercel cron header
  // For now, just log and proceed
  
  console.log("Cron scraper triggered at", new Date().toISOString());
  
  try {
    const result = await runScraper({
      sources: ["github", "rss", "twitter"],
      limit: 100,
      minConfidence: 0.55,
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
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
