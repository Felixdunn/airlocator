import { NextRequest, NextResponse } from "next/server";

// RSS Feed parser for discovering airdrop announcements from protocol blogs
// Uses public RSS feeds - no authentication required

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  content?: string;
  source: string;
}

// Known Solana protocol blogs with RSS feeds
const RSS_FEEDS = [
  {
    name: "Solana Foundation",
    url: "https://solana.com/news/rss",
  },
  {
    name: "Jupiter",
    url: "https://blog.jup.ag/rss",
  },
  {
    name: "Magic Eden",
    url: "https://magiceden.io/blog/rss",
  },
  {
    name: "Phantom",
    url: "https://phantom.app/blog/rss",
  },
  {
    name: "Marinade",
    url: "https://marinade.finance/blog/rss",
  },
  {
    name: "Raydium",
    url: "https://raydium.io/blog/rss",
  },
];

// Keywords suggesting airdrop content
const AIRDROP_KEYWORDS = [
  "airdrop",
  "token",
  "claim",
  "eligibility",
  "snapshot",
  "distribution",
  "rewards",
  "retroactive",
  "points",
  "season",
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const feed = searchParams.get("feed");
    
    if (feed) {
      // Parse specific feed
      const feedConfig = RSS_FEEDS.find(f => f.url === feed);
      if (!feedConfig) {
        return NextResponse.json(
          { success: false, error: "Unknown feed" },
          { status: 400 }
        );
      }
      
      const items = await parseRSSFeed(feedConfig.url, feedConfig.name);
      const airdropItems = filterAirdropItems(items);
      
      return NextResponse.json({
        success: true,
        data: airdropItems,
        source: feedConfig.name,
      });
    }
    
    // Parse all feeds
    const results = await Promise.all(
      RSS_FEEDS.map(async (feedConfig) => {
        try {
          const items = await parseRSSFeed(feedConfig.url, feedConfig.name);
          return {
            source: feedConfig.name,
            url: feedConfig.url,
            items: filterAirdropItems(items),
          };
        } catch (error) {
          console.error(`Error parsing ${feedConfig.name}:`, error);
          return {
            source: feedConfig.name,
            url: feedConfig.url,
            items: [],
            error: "Failed to parse",
          };
        }
      })
    );
    
    const allItems = results.flatMap(r => 
      r.items.map(item => ({
        source: r.source,
        ...item,
      }))
    );
    
    // Sort by date, newest first
    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });
    
    return NextResponse.json({
      success: true,
      data: allItems,
      count: allItems.length,
      sources: results.map(r => ({
        name: r.source,
        url: r.url,
        itemCount: r.items.length,
      })),
    });
    
  } catch (error) {
    console.error("RSS discovery error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch RSS feeds",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function parseRSSFeed(url: string, sourceName: string): Promise<RSSItem[]> {
  // Use a CORS proxy for client-side fetching
  // In production, use a server-side RSS parser like 'rss-parser'
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
  
  const response = await fetch(proxyUrl, {
    next: { revalidate: 1800 }, // Cache for 30 minutes
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.status !== "ok") {
    throw new Error("Invalid RSS response");
  }
  
  return data.items.map((item: any) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: item.description?.slice(0, 200),
    content: item.content,
    source: sourceName,
  }));
}

function filterAirdropItems(items: RSSItem[]): RSSItem[] {
  return items.filter(item => {
    const searchText = `${item.title} ${item.description || ""}`.toLowerCase();
    return AIRDROP_KEYWORDS.some(keyword => 
      searchText.includes(keyword)
    );
  });
}

export async function POST(request: NextRequest) {
  // Add new RSS feed to monitor
  try {
    const body = await request.json();
    const { name, url } = body;
    
    if (!name || !url || typeof name !== "string" || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid feed format" },
        { status: 400 }
      );
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL" },
        { status: 400 }
      );
    }
    
    // In production, add to database
    return NextResponse.json({
      success: true,
      message: "RSS feed added to monitoring list",
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to add RSS feed",
      },
      { status: 500 }
    );
  }
}
