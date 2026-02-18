"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AirdropCard } from "@/components/airdrop/AirdropCard";
import { CategoryFilter } from "@/components/airdrop/CategoryFilter";
import { WalletScannerComponent } from "@/components/airdrop/WalletScanner";
import { Airdrop, AirdropCategory, EligibilityResult } from "@/lib/types/airdrop";
import { Coins, ArrowRight, Sparkles, Shield, Wallet, Loader2, RefreshCw, Search, CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
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
}

interface ScanProgress {
  stage: 'initializing' | 'scanning-github' | 'scanning-rss' | 'scanning-twitter' | 'ai-enrichment' | 'filtering' | 'complete';
  current: number;
  total: number;
  currentItem?: string;
  estimatedTimeRemaining?: number; // seconds
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
  const { connected } = useWallet();
  const apiSettings = hasApiSettings();

  useEffect(() => {
    fetchAirdrops();
  }, []);

  const fetchAirdrops = async () => {
    try {
      setLoading(true);
      
      const liveResponse = await fetch("/api/airdrops?status=live");
      const liveData = await liveResponse.json();
      
      const allAirdrops = liveData.data || [];
      setAirdrops(allAirdrops);
      
      const featured = allAirdrops.filter((a: ApiAirdrop) => a.featured && a.verified);
      setFeaturedAirdrops(featured.slice(0, 6));
      
      const counts = new Map<AirdropCategory, number>();
      const categories: AirdropCategory[] = ["DeFi", "NFTs", "Gaming", "Governance", "Bridges", "Testnets", "Social", "Infrastructure", "Liquid Staking", "DEX", "Lending", "Perpetuals", "Oracle", "Wallet"];
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
    setScanProgress({ stage: 'initializing', current: 0, total: 100 });
    setLastScanResults(null);
    
    try {
      const settings = getApiSettings();
      const useAI = !!settings.geminiApiKey;
      
      if (!settings.githubToken && !settings.twitterBearerToken) {
        if (!confirm("No API keys configured. Scanner will use limited unauthenticated requests. Configure keys in Settings?")) {
          setScanning(false);
          setScanProgress(null);
          return;
        }
      }
      
      // Start scanning with progress updates
      const startTime = Date.now();
      
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: ["github", "rss", "twitter"],
          limit: 100,
          useAI,
        }),
      });
      
      const result = await response.json();
      const elapsed = (Date.now() - startTime) / 1000;
      
      if (result.success) {
        setScanProgress({ 
          stage: 'complete', 
          current: 100, 
          total: 100,
          estimatedTimeRemaining: 0,
        });
        setLastScanTime(new Date());
        setLastScanResults({
          new: result.data.newAirdrops,
          enriched: result.data.enrichedWithAI || 0,
          filtered: result.data.filteredOut || 0,
        });
        
        await fetchAirdrops();
        
        setTimeout(() => {
          setScanning(false);
          setScanProgress(null);
        }, 3000);
      } else {
        throw new Error(result.error || "Scan failed");
      }
    } catch (error) {
      console.error("Scanner error:", error);
      setScanning(false);
      setScanProgress(null);
      alert(`Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Update progress simulation (since we can't do real SSE easily)
  useEffect(() => {
    if (!scanning || !scanProgress) return;
    
    const stages: ScanProgress['stage'][] = [
      'initializing',
      'scanning-github',
      'scanning-rss',
      'scanning-twitter',
      'ai-enrichment',
      'filtering',
      'complete'
    ];
    
    const currentStageIndex = stages.indexOf(scanProgress.stage);
    const totalStages = stages.length;
    
    // Simulate progress through stages
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (!prev || prev.stage === 'complete') return prev;
        
        const progressPerStage = 100 / totalStages;
        const baseProgress = currentStageIndex * progressPerStage;
        const newProgress = Math.min(prev.current + 2, baseProgress + progressPerStage);
        
        // Calculate ETA based on progress
        const elapsed = Date.now();
        const percentComplete = newProgress / 100;
        const estimatedTotal = elapsed / percentComplete;
        const remaining = Math.max(0, estimatedTotal - elapsed);
        
        return {
          ...prev,
          current: newProgress,
          estimatedTimeRemaining: Math.ceil(remaining / 1000),
        };
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [scanning, scanProgress?.stage]);

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

  const getStageDisplay = (stage: ScanProgress['stage']) => {
    const displays = {
      'initializing': 'Initializing scanner...',
      'scanning-github': 'Scanning GitHub repositories...',
      'scanning-rss': 'Scanning protocol blogs...',
      'scanning-twitter': 'Scanning Twitter announcements...',
      'ai-enrichment': 'AI enrichment with Gemini...',
      'filtering': 'Filtering ongoing airdrops...',
      'complete': 'Scan complete!',
    };
    return displays[stage] || stage;
  };

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
              AI-Powered Airdrop Discovery
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Discover{" "}
              <span className="gradient-text">Free Crypto</span>{" "}
              You Didn&apos;t Know You Had
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Scan GitHub, Twitter, and protocol blogs to find ongoing Solana airdrops.
              AI verifies claims and filters out ended airdrops.
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
            
            {/* Scan Progress */}
            {scanning && scanProgress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 max-w-xl mx-auto"
              >
                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress.current}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                {/* Status */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getStageDisplay(scanProgress.stage)}</span>
                  {scanProgress.estimatedTimeRemaining && scanProgress.estimatedTimeRemaining > 0 && (
                    <span className="inline-flex items-center text-primary">
                      <Clock className="h-3 w-3 mr-1" />
                      ETA: {scanProgress.estimatedTimeRemaining}s
                    </span>
                  )}
                </div>
                
                {/* Current Item */}
                {scanProgress.currentItem && (
                  <p className="mt-2 text-xs text-muted-foreground truncate">
                    Processing: {scanProgress.currentItem}
                  </p>
                )}
              </motion.div>
            )}
            
            {/* Scan Results */}
            {lastScanResults && !scanning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto"
              >
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
              </motion.div>
            )}
            
            {/* Last scan time */}
            {lastScanTime && !scanning && (
              <p className="mt-6 text-sm text-muted-foreground">
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
                <p className="text-3xl md:text-4xl font-bold gradient-text">AI-Powered</p>
                <p className="mt-2 text-sm text-muted-foreground">Smart Filtering</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold gradient-text">2%</p>
                <p className="mt-2 text-sm text-muted-foreground">Success Fee</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ... rest of the page (Featured Airdrops, All Airdrops, Wallet Scanner sections) ... */}
      {/* For brevity, reuse existing sections from previous page.tsx */}
      
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
              Run the scanner to discover the latest ongoing airdrop opportunities.
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
