"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletScanner } from "@/lib/wallet-scanner";
import { Connection } from "@solana/web3.js";
import { EligibilityChecker } from "@/lib/eligibility-checker";
import { Airdrop, EligibilityResult } from "@/lib/types/airdrop";
import { airdrops } from "@/lib/data/airdrops";
import { Loader2, Wallet, CheckCircle2, XCircle, Coins, RefreshCw } from "lucide-react";
import { cn, formatUSD, shortenAddress } from "@/lib/utils";
import { AirdropCard } from "./AirdropCard";
import { motion, AnimatePresence } from "framer-motion";

interface WalletScannerProps {
  onEligibilityUpdate?: (results: EligibilityResult[]) => void;
}

export function WalletScannerComponent({ onEligibilityUpdate }: WalletScannerProps) {
  const { connected, publicKey, connect, disconnect } = useWallet();
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
  const [walletValue, setWalletValue] = useState<number>(0);
  const [error, setError] = useState<string>();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScan = async () => {
    if (!publicKey) return;

    setIsScanning(true);
    setError(undefined);
    setScanComplete(false);

    try {
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const scanner = new WalletScanner(connection);
      
      // Scan wallet activity
      const activity = await scanner.scanWallet(publicKey.toString());
      
      // Check eligibility for all airdrops
      const results = EligibilityChecker.checkAllAirdrops(activity, airdrops);
      
      // Get wallet value
      const value = await scanner.getWalletValue(publicKey.toString());
      setWalletValue(value);
      
      setEligibilityResults(results);
      onEligibilityUpdate?.(results);
      setScanComplete(true);
    } catch (err) {
      console.error("Scan error:", err);
      setError(err instanceof Error ? err.message : "Failed to scan wallet");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey && isClient) {
      handleScan();
    } else {
      setEligibilityResults([]);
      setScanComplete(false);
      setWalletValue(0);
    }
  }, [connected, publicKey, isClient]);

  const eligibleCount = eligibilityResults.filter(r => r.eligible).length;
  const totalValue = eligibilityResults
    .filter(r => r.eligible && r.estimatedValue)
    .reduce((sum, r) => sum + (r.estimatedValue || 0), 0);

  if (!isClient) {
    return null;
  }

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-8 text-center"
      >
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-foreground">
          Connect Your Wallet
        </h3>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Connect your Solana wallet to check which airdrops you&apos;re eligible for. 
          We&apos;ll scan your on-chain activity privately and locally.
        </p>
        <button
          onClick={connect}
          className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Wallet className="mr-2 h-5 w-5" />
          Connect Wallet
        </button>
        <p className="mt-4 text-xs text-muted-foreground">
          Supported: Phantom, Solflare, and other Solana wallets
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet info */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {shortenAddress(publicKey?.toString() || "")}
              </p>
              <p className="text-xs text-muted-foreground">
                Wallet Value: {formatUSD(walletValue)}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rescan
                </>
              )}
            </button>
            <button
              onClick={disconnect}
              className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </motion.div>

      {/* Scan results */}
      {scanComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{eligibleCount}</p>
                <p className="text-sm text-muted-foreground">Eligible Airdrops</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center space-x-3">
              <Coins className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatUSD(totalValue)}</p>
                <p className="text-sm text-muted-foreground">Potential Value</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center space-x-3">
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {eligibilityResults.length - eligibleCount}
                </p>
                <p className="text-sm text-muted-foreground">Not Eligible</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-6"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Eligible airdrops */}
      {scanComplete && eligibleCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-foreground">
            Your Eligible Airdrops
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eligibilityResults
              .filter(r => r.eligible)
              .map(result => {
                const airdrop = airdrops.find(a => a.id === result.airdropId);
                if (!airdrop) return null;
                
                return (
                  <AirdropCard
                    key={airdrop.id}
                    airdrop={airdrop}
                    eligible={result.eligible}
                    estimatedValue={result.estimatedValue}
                  />
                );
              })}
          </div>
        </motion.div>
      )}

      {/* No eligible airdrops */}
      {scanComplete && eligibleCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-8 text-center"
        >
          <p className="text-muted-foreground">
            No eligible airdrops found. Try interacting with more Solana protocols!
          </p>
        </motion.div>
      )}
    </div>
  );
}
