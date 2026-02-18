"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { AirdropCard } from "@/components/airdrop/AirdropCard";
import { CategoryFilter } from "@/components/airdrop/CategoryFilter";
import { WalletScannerComponent } from "@/components/airdrop/WalletScanner";
import { Airdrop, AirdropCategory, EligibilityResult } from "@/lib/types/airdrop";
import { Coins, ArrowRight, Sparkles, Shield, Wallet, Loader2, RefreshCw, Search, CheckCircle2, AlertCircle, Clock, Zap, Globe, Trash2, ExternalLink } from "lucide-react";
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
  discord?: string;
  telegram?: string;
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
  chains?: string[];
  primaryChain?: string;
}

interface ScanProgress {
  stage: string;
  percent: number;
  currentItem?: string;
  etaSeconds?: number;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<AirdropCategory | "all">("all");
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
  const [airdrops, setAirdrops] = useState<ApiAirdrop[]>([]);
  const [featuredAirdrops, setFeaturedAirdrops] = useState<ApiAirdrop[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Map<AirdropCategory, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [lastScanResults, setLastScanResults] = useState<{ new: number; enriched: number; filtered: number } | null>(null);
  const [showScanDetails, setShowScanDetails] = useState(false);
  const { connected } = useWallet();
  const apiSettings = hasApiSettings();
  const scanStartTime = useRef<number>(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAirdrops();
  }, []);

  const fetchAirdrops = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/airdrops");
      const data = await response.json();
      const allAirdrops = data.data || [];
      setAirdrops(allAirdrops);
      
      // Only show recently discovered airdrops as featured (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentFeatured = allAirdrops.filter((a: ApiAirdrop) => 
        a.verified && new Date(a.discoveredAt).getTime() > sevenDaysAgo
      ).slice(0, 6);
      setFeaturedAirdrops(recentFeatured);
      
      const counts = new Map<AirdropCategory, number>();
      const categories: AirdropCategory[] = ["DeFi", "NFTs", "Gaming", "Governance", "Bridges", "Testnets", "Social", "Infrastructure", "Liquid Staking", "DEX", "Lending", "Perpetuals", "Oracle", "Wallet", "Layer 2", "Restaking"];
      categories.forEach(cat => counts.set(cat, 0));
      allAirdrops.forEach((a: ApiAirdrop) => {
        a.categories.forEach(cat => counts.set(cat, (counts.get(cat) || 0) + 1));
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
    setScanProgress({ stage: 'Initializing scanner...', percent: 0, etaSeconds: undefined });
    setLastScanResults(null);
    scanStartTime.current = Date.now();
    
    try {
      const settings = getApiSettings();
      const useAI = !!settings.geminiApiKey;
      
      // Start progress simulation
      const totalEstimatedTime = 60000; // 60 seconds for comprehensive scan
      const stages = [
        { name: 'Initializing scanner...', percent: 5 },
        { name: 'Scanning GitHub repositories...', percent: 25 },
        { name: 'Scanning protocol blogs (RSS)...', percent: 40 },
        { name: 'Scanning Twitter announcements...', percent: 55 },
        { name: 'Searching web for airdrops...', percent: 70 },
        { name: 'Scanning Reddit giveaways...', percent: 85 },
        { name: 'AI enrichment with Gemini...', percent: 95 },
        { name: 'Filtering ongoing airdrops...', percent: 100 },
      ];
      
      let stageIndex = 0;
      
      progressInterval.current = setInterval(() => {
        const elapsed = Date.now() - scanStartTime.current;
        const currentStage = stages[Math.min(stageIndex, stages.length - 1)];
        const remaining = Math.max(0, Math.ceil((totalEstimatedTime - elapsed) / 1000));
        
        setScanProgress({
          stage: currentStage.name,
          percent: currentStage.percent,
          etaSeconds: stageIndex < stages.length - 1 ? remaining : 0,
        });
        
        // Advance stage based on time
        const expectedStageTime = (currentStage.percent / 100) * totalEstimatedTime;
        if (elapsed > expectedStageTime && stageIndex < stages.length - 1) {
          stageIndex++;
        }
      }, 500);
      
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sources: ["github", "rss", "twitter", "web-search", "reddit"], 
          limit: 200, 
          useAI 
        }),
      });
      
      const result = await response.json();
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      if (result.success) {
        setScanProgress({ stage: 'Scan complete!', percent: 100, etaSeconds: 0 });
        setLastScanTime(new Date());
        setLastScanResults({
          new: result.data.newAirdrops,
          enriched: result.data.enrichedWithAI || 0,
          filtered: result.data.filteredOut || 0,
        });
        setShowScanDetails(true);
        await fetchAirdrops();
        
        setTimeout(() => {
          setScanning(false);
          setScanProgress(null);
        }, 5000);
      } else {
        throw new Error(result.error || "Scan failed");
      }
    } catch (error) {
      console.error("Scanner error:", error);
      if (progressInterval.current) clearInterval(progressInterval.current);
      setScanning(false);
      setScanProgress(null);
      alert(`Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const clearOldAirdrops = async () => {
    if (!confirm("This will delete old featured airdrops and anything older than 90 days. Continue?")) return;
    
    try {
      const response = await fetch("/api/airdrops?old=true", { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        alert(`Cleared ${result.deletedCount} old airdrops`);
        await fetchAirdrops();
      }
    } catch (error) {
      alert("Failed to clear airdrops");
    }
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const filteredAirdrops = selectedCategory === "all" ? airdrops : airdrops.filter(a => a.categories.includes(selectedCategory));
  const getEligibility = (airdropId: string) => {
    if (!connected || eligibilityResults.length === 0) return undefined;
    return eligibilityResults.find(r => r.airdropId === airdropId)?.eligible;
  };
  const handleEligibilityUpdate = (results: EligibilityResult[]) => setEligibilityResults(results);
  const eligibleAirdrops = eligibilityResults.filter(r => r.eligible);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-200/40 via-transparent to-transparent dark:from-violet-900/20" />
        
        <div className="container relative mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
              <Globe className="mr-2 h-4 w-4" />
              Multi-Chain Airdrop Discovery
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Discover <span className="gradient-text">Free Crypto</span> Across All Chains
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Scan 15+ chains, Reddit giveaways, and the entire web for ongoing airdrops.
              AI verifies claims and filters out ended airdrops.
            </p>
            
            {/* Scan Button */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={runScanner} disabled={scanning} className={`inline-flex items-center rounded-lg px-8 py-4 text-base font-medium transition-all hover:shadow-lg hover:shadow-primary/30 ${scanning ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"}`}>
                {scanning ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Scanning...</>) : (<><Search className="mr-2 h-5 w-5" />Scan for Airdrops</>)}
              </button>
              <a href="#airdrops" className="inline-flex items-center rounded-lg border border-border bg-background px-8 py-4 text-base font-medium hover:bg-accent transition-colors">Browse Airdrops</a>
            </div>
            
            {/* Scan Progress */}
            {scanning && scanProgress && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 max-w-xl mx-auto">
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600" initial={{ width: 0 }} animate={{ width: `${scanProgress.percent}%` }} transition={{ duration: 0.3 }} />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{scanProgress.stage}</span>
                  {scanProgress.etaSeconds !== undefined && scanProgress.etaSeconds > 0 && (
                    <span className="inline-flex items-center text-primary"><Clock className="h-3 w-3 mr-1" />ETA: {scanProgress.etaSeconds}s</span>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Scan Results */}
            {lastScanResults && !scanning && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8">
                <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-4">
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/20 p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{lastScanResults.new}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">New Airdrops</p>
                  </div>
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-900/20 p-4 text-center">
                    <Zap className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{lastScanResults.enriched}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">AI Enriched</p>
                  </div>
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-900/20 p-4 text-center">
                    <AlertCircle className="h-6 w-6 text-gray-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-400">{lastScanResults.filtered}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Filtered (Ended)</p>
                  </div>
                </div>
                
                {/* View Details Button */}
                <button 
                  onClick={() => setShowScanDetails(!showScanDetails)}
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  {showScanDetails ? "Hide" : "View"} scan details
                </button>
                
                {showScanDetails && lastScanTime && (
                  <div className="mt-4 p-4 rounded-lg bg-muted text-sm">
                    <p className="text-muted-foreground">Scan completed at: {lastScanTime.toLocaleString()}</p>
                    <p className="text-muted-foreground mt-2">
                      Sources scanned: GitHub, RSS, Twitter, Web Search, Reddit
                    </p>
                    <button 
                      onClick={clearOldAirdrops}
                      className="mt-4 inline-flex items-center text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear old featured airdrops
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            
            {lastScanTime && !scanning && !showScanDetails && (
              <p className="mt-6 text-sm text-muted-foreground">Last scan: {lastScanTime.toLocaleString()}</p>
            )}
            
            {!apiSettings.all && (
              <Link href="/settings">
                <div className="mt-6 inline-flex items-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Configure API keys for better results <ExternalLink className="ml-1 h-3 w-3" />
                </div>
              </Link>
            )}
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div><p className="text-3xl md:text-4xl font-bold gradient-text">{loading ? "-" : airdrops.length}</p><p className="mt-2 text-sm text-muted-foreground">Live Airdrops</p></div>
              <div><p className="text-3xl md:text-4xl font-bold gradient-text">15+ Chains</p><p className="mt-2 text-sm text-muted-foreground">Multi-Chain</p></div>
              <div><p className="text-3xl md:text-4xl font-bold gradient-text">2%</p><p className="mt-2 text-sm text-muted-foreground">Success Fee</p></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Airdrops - Only recent ones */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Recent Featured Airdrops</h2>
            <button onClick={fetchAirdrops} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          </motion.div>
          
          {loading ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) : featuredAirdrops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredAirdrops.map((airdrop) => (<AirdropCard key={airdrop.id} airdrop={{...airdrop, live: airdrop.status === "live" || airdrop.status === "unverified", createdAt: new Date(airdrop.createdAt), updatedAt: new Date(airdrop.updatedAt), source: { type: "github" as const, url: airdrop.website }}} eligible={getEligibility(airdrop.id)} />))}
            </div>
          ) : (<div className="text-center py-12 text-muted-foreground"><p>No recent featured airdrops.</p><p className="text-sm mt-2">Run a scan to discover new opportunities!</p></div>)}
        </div>
      </section>

      {/* All Airdrops */}
      <section id="airdrops" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div><h2 className="text-3xl font-bold">All Live Airdrops</h2><p className="text-muted-foreground mt-1">{filteredAirdrops.length} airdrops across all chains</p></div>
            <CategoryFilter categories={categoryCounts} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
          </motion.div>
          
          {loading ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) : filteredAirdrops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAirdrops.map((airdrop) => (<AirdropCard key={airdrop.id} airdrop={{...airdrop, live: airdrop.status === "live" || airdrop.status === "unverified", createdAt: new Date(airdrop.createdAt), updatedAt: new Date(airdrop.updatedAt), source: { type: "github" as const, url: airdrop.website }}} eligible={getEligibility(airdrop.id)} />))}
            </div>
          ) : (<div className="text-center py-12 text-muted-foreground"><p>No airdrops found.</p><button onClick={runScanner} disabled={scanning} className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Search className="mr-2 h-4 w-4" />{scanning ? "Scanning..." : "Scan for Airdrops"}</button></div>)}
        </div>
      </section>

      {/* Wallet Scanner */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold">Check Your Eligibility</h2>
            <p className="mt-4 text-lg text-muted-foreground">Scan your wallets to find claimable airdrops</p>
          </motion.div>
          <div className="max-w-4xl mx-auto"><WalletScannerComponent onEligibilityUpdate={handleEligibilityUpdate} /></div>
          {eligibleAirdrops.length > 0 && (<div className="max-w-4xl mx-auto mt-8"><button onClick={() => setShowClaimModal(true)} className="w-full inline-flex items-center justify-center rounded-lg bg-primary px-6 py-4 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30"><Coins className="mr-2 h-5 w-5" />Claim All ({eligibleAirdrops.length} airdrops)</button></div>)}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-fuchsia-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Find More Airdrops?</h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">Scan 15+ chains, Reddit, and the entire web for opportunities.</p>
            <button onClick={runScanner} disabled={scanning} className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-4 text-base font-medium text-primary hover:bg-white/90 transition-colors disabled:opacity-50">
              {scanning ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Scanning...</>) : (<><Search className="mr-2 h-5 w-5" />Scan All Sources</>)}
            </button>
          </motion.div>
        </div>
      </section>

      <ClaimAllModal eligibleAirdrops={eligibleAirdrops} isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} />
    </div>
  );
}
