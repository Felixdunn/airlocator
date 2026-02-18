import { NextRequest, NextResponse } from "next/server";
import { Airdrop, AirdropCategory } from "@/lib/types/airdrop";

// AI-powered airdrop classifier
// Uses simple keyword matching for MVP (can be enhanced with actual AI/ML)

interface RawAirdropData {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt?: string;
  content?: string;
}

interface ClassifiedAirdrop {
  categories: AirdropCategory[];
  confidence: number;
  isAirdrop: boolean;
  frictionLevel: "low" | "medium" | "high";
  claimType: "on-chain" | "off-chain" | "mixed";
  estimatedValueRange?: { min: number; max: number };
}

// Category keywords for classification
const CATEGORY_KEYWORDS: Record<AirdropCategory, string[]> = {
  DeFi: [
    "defi",
    "dex",
    "swap",
    "liquidity",
    "yield",
    "lending",
    "borrowing",
    "staking",
    "farming",
    "perpetual",
    "futures",
    "options",
    "derivative",
  ],
  NFTs: [
    "nft",
    "collectible",
    "art",
    "marketplace",
    "mint",
    "collection",
    "pfp",
    "generative",
  ],
  Gaming: [
    "game",
    "gaming",
    "play-to-earn",
    "p2e",
    "metaverse",
    "virtual",
    "world",
    "character",
    "item",
  ],
  Governance: [
    "dao",
    "governance",
    "vote",
    "proposal",
    "treasury",
    "community",
    "decision",
  ],
  Bridges: [
    "bridge",
    "cross-chain",
    "multichain",
    "interop",
    "wormhole",
    "layerzero",
  ],
  Testnets: [
    "testnet",
    "devnet",
    "beta",
    "testing",
    "validator",
    "node",
  ],
  Social: [
    "social",
    "farcaster",
    "lens",
    "friend",
    "follow",
    "content",
    "creator",
  ],
  Infrastructure: [
    "infrastructure",
    "rpc",
    "node",
    "validator",
    "oracle",
    "indexer",
    "sdk",
    "protocol",
    "layer",
  ],
};

// Friction level indicators
const FRICTION_INDICATORS = {
  low: ["claim", "instant", "simple", "easy", "connect"],
  medium: ["interact", "use", "trade", "swap", "provide"],
  high: ["testnet", "quest", "task", "galxe", "zealy", "points", "grind"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }
    
    const results = items.map((item: RawAirdropData) => {
      const classification = classifyAirdrop(item);
      return {
        ...item,
        ...classification,
      };
    });
    
    // Filter to only likely airdrops
    const airdrops = results.filter(r => r.isAirdrop && r.confidence > 0.5);
    
    return NextResponse.json({
      success: true,
      data: airdrops,
      totalProcessed: items.length,
      airdropsFound: airdrops.length,
    });
    
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to classify",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function classifyAirdrop(data: RawAirdropData): ClassifiedAirdrop {
  const text = `${data.title} ${data.description} ${data.content || ""}`.toLowerCase();
  
  // Check if it's actually about airdrops
  const airdropKeywords = [
    "airdrop",
    "token distribution",
    "claim",
    "eligibility",
    "snapshot",
    "rewards",
    "retroactive",
    "token launch",
  ];
  
  const isAirdrop = airdropKeywords.some(keyword => text.includes(keyword));
  
  // Calculate confidence based on keyword matches
  let matchCount = 0;
  airdropKeywords.forEach(keyword => {
    if (text.includes(keyword)) matchCount++;
  });
  
  const confidence = isAirdrop ? Math.min(matchCount / 3, 1) : 0;
  
  // Classify categories
  const categories: AirdropCategory[] = [];
  (Object.keys(CATEGORY_KEYWORDS) as AirdropCategory[]).forEach(category => {
    const keywords = CATEGORY_KEYWORDS[category];
    const matches = keywords.filter(kw => text.includes(kw));
    if (matches.length >= 1) {
      categories.push(category);
    }
  });
  
  // Determine friction level
  let frictionLevel: "low" | "medium" | "high" = "medium";
  const lowMatches = FRICTION_INDICATORS.low.filter(kw => text.includes(kw));
  const mediumMatches = FRICTION_INDICATORS.medium.filter(kw => text.includes(kw));
  const highMatches = FRICTION_INDICATORS.high.filter(kw => text.includes(kw));
  
  if (highMatches.length > lowMatches.length && highMatches.length > mediumMatches.length) {
    frictionLevel = "high";
  } else if (lowMatches.length > mediumMatches.length) {
    frictionLevel = "low";
  }
  
  // Determine claim type
  let claimType: "on-chain" | "off-chain" | "mixed" = "on-chain";
  if (text.includes("off-chain") || text.includes("website") || text.includes("form")) {
    claimType = text.includes("on-chain") ? "mixed" : "off-chain";
  }
  
  // Estimate value (very rough heuristic)
  let estimatedValueRange: { min: number; max: number } | undefined;
  if (text.includes("jupiter") || text.includes("jup")) {
    estimatedValueRange = { min: 100, max: 1000 };
  } else if (text.includes("jito") || text.includes("jto")) {
    estimatedValueRange = { min: 50, max: 500 };
  } else if (categories.includes("DeFi")) {
    estimatedValueRange = { min: 50, max: 300 };
  } else if (categories.includes("Gaming")) {
    estimatedValueRange = { min: 20, max: 200 };
  }
  
  return {
    categories: categories.length > 0 ? categories : ["Infrastructure"],
    confidence,
    isAirdrop,
    frictionLevel,
    claimType,
    estimatedValueRange,
  };
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    success: true,
    message: "AI Classifier API is running",
    version: "1.0.0",
  });
}
