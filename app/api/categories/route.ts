import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { withValidation, sanitizeString } from "@/lib/middleware/validation";
import { getCategoryCounts, CATEGORIES } from "@/lib/data/airdrops";

// GET /api/categories - Get all categories with counts
export const GET = withValidation(async (request: NextRequest) => {
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  const counts = getCategoryCounts();
  
  // Return only categories with airdrops
  const categoriesWithCount = CATEGORIES
    .map(category => ({
      name: category,
      count: counts.get(category) || 0,
    }))
    .filter(c => c.count > 0);
  
  return NextResponse.json({
    success: true,
    data: categoriesWithCount,
    total: categoriesWithCount.reduce((sum, c) => sum + c.count, 0),
  });
});
