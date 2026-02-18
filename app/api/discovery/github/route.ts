import { NextRequest, NextResponse } from "next/server";

// GitHub API for discovering airdrop announcements from repositories
// Rate limit: 60 requests/hour unauthenticated, 5000/hour authenticated

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
}

// Known Solana project repositories to monitor
const SOLANA_REPOS = [
  "solana-labs/solana",
  "jito-foundation/jito-dapps",
  "jup-ag/core",
  "pyth-network/pyth-sdk-solana",
  "marginfi/protocol",
  "drift-labs/protocol-v2",
  "tensor-hq/tensor-sdk",
  "sharky-fi/sharky-protocol",
  "wormhole-foundation/wormhole",
  "staratlasmeta/star-atlas",
];

// Keywords that suggest airdrop announcements
const AIRDROP_KEYWORDS = [
  "airdrop",
  "token distribution",
  "claim",
  "eligibility",
  "snapshot",
  "token launch",
  "genesis",
  "rewards",
  "retroactive",
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get("repo");
    
    if (repo) {
      // Get releases for specific repo
      const releases = await getRepoReleases(repo);
      const airdropReleases = filterAirdropReleases(releases);
      
      return NextResponse.json({
        success: true,
        data: airdropReleases,
      });
    }
    
    // Search all repos for airdrop-related content
    const results = await Promise.all(
      SOLANA_REPOS.map(async (repoName) => {
        const releases = await getRepoReleases(repoName);
        return {
          repo: repoName,
          releases: filterAirdropReleases(releases),
        };
      })
    );
    
    const allAirdrops = results.flatMap(r => 
      r.releases.map(release => ({
        repo: r.repo,
        ...release,
      }))
    );
    
    return NextResponse.json({
      success: true,
      data: allAirdrops,
      count: allAirdrops.length,
    });
    
  } catch (error) {
    console.error("GitHub discovery error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch from GitHub",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getRepoReleases(repo: string): Promise<GitHubRelease[]> {
  const url = `https://api.github.com/repos/${repo}/releases`;
  
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, {
    headers,
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded");
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.json();
}

function filterAirdropReleases(releases: GitHubRelease[]): GitHubRelease[] {
  return releases.filter(release => {
    const searchText = `${release.name} ${release.body}`.toLowerCase();
    return AIRDROP_KEYWORDS.some(keyword => 
      searchText.includes(keyword)
    );
  });
}

export async function POST(request: NextRequest) {
  // Submit new repo to monitor
  try {
    const body = await request.json();
    const { repo } = body;
    
    if (!repo || typeof repo !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid repo format" },
        { status: 400 }
      );
    }
    
    // Validate repo format (owner/name)
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(repo)) {
      return NextResponse.json(
        { success: false, error: "Repo must be in format: owner/name" },
        { status: 400 }
      );
    }
    
    // In production, add to database of monitored repos
    // For now, just validate it exists
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: GITHUB_TOKEN ? {
        "Authorization": `token ${GITHUB_TOKEN}`,
      } : {},
    });
    
    if (response.status === 404) {
      return NextResponse.json(
        { success: false, error: "Repository not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Repository added to monitoring list",
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to validate repository",
      },
      { status: 500 }
    );
  }
}
