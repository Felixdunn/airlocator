"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AirdropCard } from "@/components/airdrop/AirdropCard";
import { CategoryFilter } from "@/components/airdrop/CategoryFilter";
import { WalletScannerComponent } from "@/components/airdrop/WalletScanner";
import { Airdrop, AirdropCategory, EligibilityResult } from "@/lib/types/airdrop";
import { Coins, ArrowRight, Sparkles, Shield, Wallet, Loader2, RefreshCw } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ClaimAllModal } from "@/components/airdrop/ClaimAllModal";

interface ApiAirdrop {
  id: string;
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter?: string;
  blog?: string;
  claimUrl?: string;
  claimType: "on-chain" | "off-chain" | "mixed";
  estimatedValueUSD?: number;
  estimatedValueRange?: { min: number; max: number };
  categories: AirdropCategory[];
  frictionLevel: "low" | "medium" | "high";
  imageUrl?: string;
  verified: boolean;
  featured: boolean;
  status: "live" | "upcoming" | "ended" | "unverified";
  discoveredAt: string;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<AirdropCategory | "all">("all");
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
  const [airdrops, setAirdrops] = useState<ApiAirdrop[]>([]);
  const [featuredAirdrops, setFeaturedAirdrops] = useState<ApiAirdrop[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Map<AirdropCategory, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const { connected } = useWallet();

  // Fetch airdrops from API
  useEffect(() => {
    fetchAirdrops();
  }, []);

  const fetchAirdrops = async () => {
    try {
      setLoading(true);
      
      // Fetch live airdrops
      const liveResponse = await fetch("/api/airdrops?status=live");
      const liveData = await liveResponse.json();
      
      // Fetch unverified airdrops
      const unverifiedResponse = await fetch("/api/airdrops?status=unverified");
      const unverifiedData = await unverifiedResponse.json();
      
      const allAirdrops = [...(liveData.data || []), ...(unverifiedData.data || [])];
      setAirdrops(allAirdrops);
      
      // Filter featured
      const featured = allAirdrops.filter((a: ApiAirdrop) => a.featured);
      setFeaturedAirdrops(featured.slice(0, 6));
      
      // Calculate category counts
      const counts = new Map<AirdropCategory, number>();
      const categories: AirdropCategory[] = [
        "DeFi", "NFTs", "Gaming", "Governance", "Bridges",
        "Testnets", "Social", "Infrastructure", "Liquid Staking",
        "DEX", "Lending", "Perpetuals", "Oracle", "Wallet"
      ];
      categories.forEach(cat => counts.set(cat, 0));
      
      allAirdrops.forEach((airdrop: ApiAirdrop) => {
        airdrop.categories.forEach(cat => {
          counts.set(cat, (counts.get(cat) || 0) + 1);
        });
      });
      setCategoryCounts(counts);
      
    } catch (error) {
      console.error("Failed to fetch airdrops:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter airdrops by category
  const filteredAirdrops = selectedCategory === "all"
    ? airdrops
    : airdrops.filter(a => a.categories.includes(selectedCategory));

  // Get eligibility status for connected wallet
  const getEligibility = (airdropId: string) => {
    if (!connected || eligibilityResults.length === 0) return undefined;
    const result = eligibilityResults.find(r => r.airdropId === airdropId);
    return result?.eligible;
  };

  const handleEligibilityUpdate = (results: EligibilityResult[]) => {
    setEligibilityResults(results);
  };

  const eligibleAirdrops = eligibilityResults.filter(r => r.eligible);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-200/40 via-transparent to-transparent dark:from-violet-900/20" />
        
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="mr-2 h-4 w-4" />
              Real-Time Airdrop Discovery
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Discover{" "}
              <span className="gradient-text">Free Crypto</span>{" "}
              You Didn&apos;t Know You Had
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              We scan GitHub, Twitter, and protocol blogs 24/7 to find Solana airdrops. 
              Connect your wallet to check eligibility and claim instantly.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#airdrops"
                className="inline-flex items-center rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                Browse Airdrops
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-lg border border-border bg-background px-8 py-3 text-base font-medium hover:bg-accent transition-colors"
              >
                How It Works
              </a>
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">
                  {loading ? "-" : airdrops.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Live Airdrops</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">24/7</p>
                <p className="mt-2 text-sm text-muted-foreground">Auto-Discovery</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">2%</p>
                <p className="mt-2 text-sm text-muted-foreground">Success Fee</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to claim your free crypto
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Wallet,
                title: "Connect Wallet",
                description: "Connect your Solana wallet securely. We never custody your funds.",
              },
              {
                icon: Shield,
                title: "Check Eligibility",
                description: "We scan your on-chain activity and match you with eligible airdrops.",
              },
              {
                icon: Coins,
                title: "Claim Rewards",
                description: "Claim directly through our fee router. Pay 2% only on success.",
              },
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-2xl border border-border bg-card p-8 text-center card-hover"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Airdrops */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <h2 className="text-3xl font-bold">Featured Airdrops</h2>
            <button
              onClick={fetchAirdrops}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </motion.div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : featuredAirdrops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredAirdrops.map((airdrop) => (
                <AirdropCard
                  key={airdrop.id}
                  airdrop={{
                    ...airdrop,
                    live: airdrop.status === "live" || airdrop.status === "unverified",
                    createdAt: new Date(airdrop.createdAt),
                    updatedAt: new Date(airdrop.updatedAt),
                    source: { type: "github" as const, url: airdrop.website },
                  }}
                  eligible={getEligibility(airdrop.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No featured airdrops available. Check back soon!</p>
              <p className="text-sm mt-2">Our scraper runs every 6 hours to find new airdrops.</p>
            </div>
          )}
        </div>
      </section>

      {/* All Airdrops with Filter */}
      <section id="airdrops" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div>
              <h2 className="text-3xl font-bold">All Live Airdrops</h2>
              <p className="text-muted-foreground mt-1">
                {filteredAirdrops.length} airdrops available
              </p>
            </div>
            
            <CategoryFilter
              categories={categoryCounts}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </motion.div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAirdrops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAirdrops.map((airdrop) => (
                <AirdropCard
                  key={airdrop.id}
                  airdrop={{
                    ...airdrop,
                    live: airdrop.status === "live" || airdrop.status === "unverified",
                    createdAt: new Date(airdrop.createdAt),
                    updatedAt: new Date(airdrop.updatedAt),
                    source: { type: "github" as const, url: airdrop.website },
                  }}
                  eligible={getEligibility(airdrop.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No airdrops found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* Wallet Scanner */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold">Check Your Eligibility</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Scan your wallet to find airdrops you can claim right now
            </p>
          </motion.div>
          
          <div className="max-w-4xl mx-auto">
            <WalletScannerComponent onEligibilityUpdate={handleEligibilityUpdate} />
          </div>
          
          {/* Claim All Button */}
          {eligibleAirdrops.length > 0 && (
            <div className="max-w-4xl mx-auto mt-8">
              <button
                onClick={() => setShowClaimModal(true)}
                className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-6 py-4 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <Coins className="mr-2 h-5 w-5" />
                Claim All ({eligibleAirdrops.length} airdrops)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-fuchsia-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Claim Your Airdrops?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
              Connect your wallet and start claiming free tokens from Solana protocols you already use.
            </p>
            <a
              href="#airdrops"
              className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-base font-medium text-primary hover:bg-white/90 transition-colors"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Claim All Modal */}
      <ClaimAllModal
        eligibleAirdrops={eligibleAirdrops}
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
      />
    </div>
  );
}
