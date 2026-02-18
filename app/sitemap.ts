import { MetadataRoute } from "next";
import { getLiveAirdrops } from "@/lib/data/airdrops";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://solana-airdrop-tracker.vercel.app";
  const airdrops = getLiveAirdrops();
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/solana-airdrop-checker`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-to-claim-solana-airdrops`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
  
  // Dynamic airdrop pages
  const airdropPages: MetadataRoute.Sitemap = airdrops.map((airdrop) => ({
    url: `${baseUrl}/airdrop/${airdrop.id}`,
    lastModified: airdrop.updatedAt,
    changeFrequency: "daily" as const,
    priority: airdrop.featured ? 0.8 : 0.7,
  }));
  
  return [...staticPages, ...airdropPages];
}
