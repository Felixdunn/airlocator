"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AirdropCard } from "@/components/airdrop/AirdropCard";
import { CategoryFilter } from "@/components/airdrop/CategoryFilter";
import { WalletScannerComponent } from "@/components/airdrop/WalletScanner";
import { Airdrop, AirdropCategory, EligibilityResult } from "@/lib/types/airdrop";
import { Coins, ArrowRight, Sparkles, Shield, Wallet, Loader2, RefreshCw, Search, Play, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ClaimAllModal } from "@/components/airdrop/ClaimAllModal";
import { getApiSettings, hasApiSettings } from "@/lib/utils/cookies";
import Link from "next/link";

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
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: string; count: number } | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const { connected } = useWallet();
  const apiSettings = hasApiSettings();

  // Fetch airdrops on mount (just load existing, don't scan)
  useEffect(() => {
    fetchAirdrops();
  }, []);

  const fetchAirdrops = async () => {
    try {
      setLoading(true);
      
      const liveResponse = await fetch("/api/airdrops?status=live");
      const liveData = await liveResponse.json();
      
      const unverifiedResponse = await fetch("/api/airdrops?status=unverified");
      const unverifiedData = await unverifiedResponse.json();
      
      const allAirdrops = [...(liveData.data || []), ...(unverifiedData.data || [])];
      setAirdrops(allAirdrops);
      
      const featured = allAirdrops.filter((a: ApiAirdrop) => a.featured);
      setFeaturedAirdrops(featured.slice(0, 6));
      
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

  const runScanner = async () => {
    setScanning(true);
    setScanProgress({ current: "Initializing...", count: 0 });
    
    try {
      // Check if API keys are configured
      const settings = getApiSettings();
      if (!settings.githubToken && !settings.twitterBearerToken) {
        if (!confirm("No API keys configured. Scanner will use limited unauthenticated requests. Configure keys in Settings?")) {
          setScanning(false);
          setScanProgress(null);
          return;
        }
      }
      
      // Start scanning
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: ["github", "rss", "twitter"],
          limit: 100,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setScanProgress({ 
          current: "Complete!", 
          count: result.data.newAirdrops + result.data.updatedAirdrops 
        });
        setLastScanTime(new Date());
        
        // Refresh airdrop list
        await fetchAirdrops();
        
        // Show success message
        setTimeout(() => {
          alert(`Scan complete! Found ${result.data.newAirdrops} new airdrops and updated ${result.data.updatedAirdrops} existing ones.`);
        }, 500);
      } else {
        alert(`Scan failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Scanner error:", error);
      alert(`Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setScanning(false);
      setTimeout(() => setScanProgress(null), 3000);
    }
  };

  const filteredAirdrops = selectedCategory === "all"
    ? airdrops
    : airdrops.filter(a => a.categories.includes(selectedCategory));

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
              Scan GitHub, Twitter, and protocol blogs to find Solana airdrops. 
              Connect your wallet to check eligibility and claim instantly.
            </p>
            
            {/* Scan Button */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={runScanner}
                disabled={scanning}
                className={`
                  inline-flex items-center rounded-lg px-8 py-4 text-base font-medium 
                  transition-all hover:shadow-lg hover:shadow-primary/30
                  ${scanning 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"
                  }
                `}
              >
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Scan for Airdrops
                  </>
                )}
              </button>
              
              <a
                href="#airdrops"
                className="inline-flex items-center rounded-lg border border-border bg-background px-8 py-4 text-base font-medium hover:bg-accent transition-colors"
              >
                Browse Airdrops
              </a>
            </div>
            
            {/* Scan Status */}
            <AnimatePresence>
              {scanProgress && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {scanProgress.current}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Found {scanProgress.count} airdrops
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Last scan time */}
            {lastScanTime && !scanning && (
              <p className="mt-4 text-sm text-muted-foreground">
                Last scan: {lastScanTime.toLocaleString()}
              </p>
            )}
            
            {/* API Status Warning */}
            {!apiSettings.all && (
              <Link href="/settings">
                <div className="mt-6 inline-flex items-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Configure API keys for better results →
                </div>
              </Link>
            )}
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">
                  {loading ? "-" : airdrops.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Live Airdrops</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">On-Demand</p>
                <p className="mt-2 text-sm text-muted-foreground">Manual Scanning</p>
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
                icon: Search,
                title: "Scan for Airdrops",
                description: "Click the scan button to search GitHub, Twitter, and blogs for new airdrops.",
              },
              {
                icon: Wallet,
                title: "Connect Wallet",
                description: "Connect your Solana wallet securely. We never custody your funds.",
              },
              {
                icon: Coins,
                title: "Claim Rewards",
                description: "Check eligibility and claim directly. Pay 2% only on success.",
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
              <p>No airdrops found yet.</p>
              <p className="text-sm mt-2">Click &quot;Scan for Airdrops&quot; above to discover new airdrops!</p>
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
              <button
                onClick={runScanner}
                disabled={scanning}
                className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Search className="mr-2 h-4 w-4" />
                {scanning ? "Scanning..." : "Scan for Airdrops"}
              </button>
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
              Ready to Find More Airdrops?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
              Run the scanner to discover the latest airdrop opportunities.
            </p>
            <button
              onClick={runScanner}
              disabled={scanning}
              className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-medium text-primary hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Scan for Airdrops Now
                </>
              )}
            </button>
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
