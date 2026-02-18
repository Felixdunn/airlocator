// Airdrop data store interface
// In production, this connects to Vercel KV / Redis

import { Airdrop, AirdropCategory, AirdropStatus } from "@/lib/types/airdrop";

// In-memory store for development (replace with Vercel KV in production)
const airdropStore = new Map<string, Airdrop>();

export interface AirdropFilters {
  status?: AirdropStatus;
  category?: AirdropCategory;
  frictionLevel?: "low" | "medium" | "high";
  verified?: boolean;
  featured?: boolean;
  search?: string;
}

export async function getAllAirdrops(): Promise<Airdrop[]> {
  // In production, fetch from Vercel KV
  // const kv = await kv();
  // const keys = await kv.keys("airdrop:*");
  // return await Promise.all(keys.map(k => kv.get(k)));
  
  return Array.from(airdropStore.values());
}

export async function getLiveAirdrops(): Promise<Airdrop[]> {
  const all = await getAllAirdrops();
  return all.filter(a => a.status === "live" || a.status === "unverified");
}

export async function getFeaturedAirdrops(): Promise<Airdrop[]> {
  const all = await getAllAirdrops();
  return all.filter(a => a.featured && (a.status === "live" || a.status === "unverified"));
}

export async function getAirdropById(id: string): Promise<Airdrop | null> {
  // In production: return await kv.get(`airdrop:${id}`);
  return airdropStore.get(id) || null;
}

export async function getAirdropsByCategory(category: AirdropCategory): Promise<Airdrop[]> {
  const all = await getAllAirdrops();
  return all.filter(a => 
    a.categories.includes(category) && 
    (a.status === "live" || a.status === "unverified")
  );
}

export async function getAirdropsByFilters(filters: AirdropFilters): Promise<Airdrop[]> {
  let all = await getAllAirdrops();
  
  if (filters.status) {
    all = all.filter(a => a.status === filters.status);
  }
  
  if (filters.category) {
    all = all.filter(a => a.categories.includes(filters.category!));
  }
  
  if (filters.frictionLevel) {
    all = all.filter(a => a.frictionLevel === filters.frictionLevel);
  }
  
  if (filters.verified !== undefined) {
    all = all.filter(a => a.verified === filters.verified);
  }
  
  if (filters.featured !== undefined) {
    all = all.filter(a => a.featured === filters.featured);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    all = all.filter(a => 
      a.name.toLowerCase().includes(searchLower) ||
      a.symbol.toLowerCase().includes(searchLower) ||
      a.description.toLowerCase().includes(searchLower)
    );
  }
  
  return all;
}

export async function saveAirdrop(airdrop: Airdrop): Promise<void> {
  // In production: await kv.set(`airdrop:${airdrop.id}`, airdrop);
  airdropStore.set(airdrop.id, airdrop);
}

export async function updateAirdrop(id: string, updates: Partial<Airdrop>): Promise<void> {
  const existing = await getAirdropById(id);
  if (!existing) {
    throw new Error(`Airdrop ${id} not found`);
  }
  
  const updated = { ...existing, ...updates, updatedAt: new Date() };
  await saveAirdrop(updated);
}

export async function deleteAirdrop(id: string): Promise<void> {
  // In production: await kv.del(`airdrop:${id}`);
  airdropStore.delete(id);
}

export async function getCategoryCounts(): Promise<Map<AirdropCategory, number>> {
  const all = await getAllAirdrops();
  const counts = new Map<AirdropCategory, number>();
  
  const categories: AirdropCategory[] = [
    "DeFi", "NFTs", "Gaming", "Governance", "Bridges", 
    "Testnets", "Social", "Infrastructure", "Liquid Staking",
    "DEX", "Lending", "Perpetuals", "Oracle", "Wallet"
  ];
  
  categories.forEach(cat => counts.set(cat, 0));
  
  all.forEach(airdrop => {
    if (airdrop.status === "live" || airdrop.status === "unverified") {
      airdrop.categories.forEach(cat => {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      });
    }
  });
  
  return counts;
}

export async function getRecentAirdrops(limit: number = 10): Promise<Airdrop[]> {
  const all = await getAllAirdrops();
  return all
    .filter(a => a.status === "live" || a.status === "unverified")
    .sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime())
    .slice(0, limit);
}

export async function getUpcomingAirdrops(): Promise<Airdrop[]> {
  const all = await getAllAirdrops();
  return all.filter(a => a.status === "upcoming");
}

// Initialize with empty store (no mock data)
export async function initializeAirdropStore(): Promise<void> {
  // Start with empty store - all data comes from scraping
  console.log("Airdrop store initialized (empty - waiting for scraper)");
}
