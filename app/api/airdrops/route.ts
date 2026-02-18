// GET /api/airdrops - List all airdrops with filtering
// Uses real data from scraper store

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { withValidation, sanitizeString } from "@/lib/middleware/validation";
import { getAirdropsByFilters, getLiveAirdrops, getFeaturedAirdrops } from "@/lib/data/airdrop-store";
import { AirdropFilters, AirdropStatus } from "@/lib/types/airdrop";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: AirdropFilters = {
      status: (searchParams.get("status") as AirdropStatus) || undefined,
      category: searchParams.get("category") ? sanitizeString(searchParams.get("category")!) as any : undefined,
      frictionLevel: searchParams.get("friction") as any || undefined,
      verified: searchParams.get("verified") === "true" ? true : searchParams.get("verified") === "false" ? false : undefined,
      featured: searchParams.get("featured") === "true" ? true : undefined,
      search: searchParams.get("search") ? sanitizeString(searchParams.get("search")!) : undefined,
    };
    
    // Default to live/unverified if no status specified
    if (!filters.status) {
      filters.status = "live";
    }
    
    const airdrops = await getAirdropsByFilters(filters);
    
    // Return sanitized data (exclude rules which are server-side only)
    const sanitizedAirdrops = airdrops.map(({ rules, ...airdrop }) => ({
      id: airdrop.id,
      name: airdrop.name,
      symbol: airdrop.symbol,
      description: airdrop.description,
      website: airdrop.website,
      twitter: airdrop.twitter,
      blog: airdrop.blog,
      discord: airdrop.discord,
      telegram: airdrop.telegram,
      claimUrl: airdrop.claimUrl,
      claimType: airdrop.claimType,
      claimDeadline: airdrop.claimDeadline,
      claimStartDate: airdrop.claimStartDate,
      estimatedValueUSD: airdrop.estimatedValueUSD,
      estimatedValueRange: airdrop.estimatedValueRange,
      tokenPrice: airdrop.tokenPrice,
      categories: airdrop.categories,
      frictionLevel: airdrop.frictionLevel,
      imageUrl: airdrop.imageUrl,
      bannerUrl: airdrop.bannerUrl,
      verified: airdrop.verified,
      featured: airdrop.featured,
      status: airdrop.status,
      communityScore: airdrop.communityScore,
      upvotes: airdrop.upvotes,
      downvotes: airdrop.downvotes,
      requirements: airdrop.requirements,
      discoveredAt: airdrop.discoveredAt,
      lastVerifiedAt: airdrop.lastVerifiedAt,
      createdAt: airdrop.createdAt,
      updatedAt: airdrop.updatedAt,
    }));
    
    return NextResponse.json({
      success: true,
      data: sanitizedAirdrops,
      count: sanitizedAirdrops.length,
      filters: {
        status: filters.status,
        category: filters.category,
        frictionLevel: filters.frictionLevel,
      },
    });
  } catch (error) {
    console.error("Error fetching airdrops:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch airdrops",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
