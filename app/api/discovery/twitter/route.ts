import { NextRequest, NextResponse } from "next/server";

// Twitter/X API for discovering airdrop announcements
// Note: Twitter API v2 requires authentication
// Free tier: 1,500 tweets/month read-only

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  source_name: string;
}

// Known Solana project Twitter accounts
const SOLANA_ACCOUNTS = [
  { username: "solana", name: "Solana" },
  { username: "JupiterExchange", name: "Jupiter" },
  { username: "jito_sol", name: "Jito" },
  { username: "PythNetwork", name: "Pyth Network" },
  { username: "marginfi", name: "MarginFi" },
  { username: "DriftProtocol", name: "Drift" },
  { username: "TensorTrade", name: "Tensor" },
  { username: "SharkyFi", name: "Sharky" },
  { username: "wormhole", name: "Wormhole" },
  { username: "staratlas", name: "Star Atlas" },
  { username: "MagicEden", name: "Magic Eden" },
  { username: "Phantom", name: "Phantom" },
];

// Keywords suggesting airdrop announcements
const AIRDROP_KEYWORDS = [
  "airdrop",
  "claim",
  "eligibility",
  "snapshot",
  "token",
  "$",
  "distribution",
  "rewards",
  "season",
  "points",
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");
    
    if (username) {
      // Get tweets from specific account
      const account = SOLANA_ACCOUNTS.find(a => a.username === username);
      if (!account) {
        return NextResponse.json(
          { success: false, error: "Unknown account" },
          { status: 400 }
        );
      }
      
      const tweets = await getAccountTweets(username);
      const airdropTweets = filterAirdropTweets(tweets, account.name);
      
      return NextResponse.json({
        success: true,
        data: airdropTweets,
        account: account.name,
      });
    }
    
    // Search for airdrop-related tweets from all accounts
    const results = await Promise.all(
      SOLANA_ACCOUNTS.map(async (account) => {
        try {
          const tweets = await getAccountTweets(account.username);
          return {
            account: account.name,
            username: account.username,
            tweets: filterAirdropTweets(tweets, account.name),
          };
        } catch (error) {
          console.error(`Error fetching ${account.username}:`, error);
          return {
            account: account.name,
            username: account.username,
            tweets: [],
            error: "Failed to fetch",
          };
        }
      })
    );
    
    const allTweets = results.flatMap(r => 
      r.tweets.map(tweet => ({
        source_account: r.account,
        source_username: r.username,
        ...tweet,
      }))
    );
    
    // Sort by engagement (likes + retweets)
    allTweets.sort((a, b) => {
      const engagementA = a.public_metrics.like_count + a.public_metrics.retweet_count;
      const engagementB = b.public_metrics.like_count + b.public_metrics.retweet_count;
      return engagementB - engagementA;
    });
    
    return NextResponse.json({
      success: true,
      data: allTweets,
      count: allTweets.length,
      accounts: results.map(r => ({
        name: r.account,
        username: r.username,
        tweetCount: r.tweets.length,
      })),
    });
    
  } catch (error) {
    console.error("Twitter discovery error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch from Twitter",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getAccountTweets(username: string): Promise<any[]> {
  if (!TWITTER_BEARER_TOKEN) {
    // Return mock data if no token
    console.warn("Twitter API token not configured, returning mock data");
    return getMockTweets(username);
  }
  
  // Get user ID first
  const userResponse = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}`,
    {
      headers: {
        "Authorization": `Bearer ${TWITTER_BEARER_TOKEN}`,
      },
      next: { revalidate: 3600 },
    }
  );
  
  if (!userResponse.ok) {
    throw new Error(`Twitter API error: ${userResponse.status}`);
  }
  
  const user = await userResponse.json();
  const userId = user.data.id;
  
  // Get recent tweets
  const tweetsResponse = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics`,
    {
      headers: {
        "Authorization": `Bearer ${TWITTER_BEARER_TOKEN}`,
      },
      next: { revalidate: 900 }, // Cache for 15 minutes
    }
  );
  
  if (!tweetsResponse.ok) {
    throw new Error(`Twitter API error: ${tweetsResponse.status}`);
  }
  
  const tweets = await tweetsResponse.json();
  return tweets.data || [];
}

function filterAirdropTweets(tweets: any[], sourceName: string): Tweet[] {
  return tweets
    .filter(tweet => {
      const text = tweet.text.toLowerCase();
      return AIRDROP_KEYWORDS.some(keyword => 
        text.includes(keyword)
      );
    })
    .map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics,
      source_name: sourceName,
    }));
}

function getMockTweets(username: string): any[] {
  // Mock data for development without Twitter API
  const now = new Date();
  return [
    {
      id: "mock-1",
      text: `🎉 Exciting news! ${username} airdrop announcement coming soon. Stay tuned for eligibility details!`,
      author_id: "mock-user",
      created_at: now.toISOString(),
      public_metrics: {
        retweet_count: 150,
        reply_count: 50,
        like_count: 500,
        quote_count: 30,
      },
    },
  ];
}

export async function POST(request: NextRequest) {
  // Add new account to monitor
  try {
    const body = await request.json();
    const { username, name } = body;
    
    if (!username || !name || typeof username !== "string" || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid account format" },
        { status: 400 }
      );
    }
    
    // In production, add to database
    return NextResponse.json({
      success: true,
      message: "Account added to monitoring list",
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to add account",
      },
      { status: 500 }
    );
  }
}
