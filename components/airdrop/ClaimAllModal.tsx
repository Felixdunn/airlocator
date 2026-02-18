"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { Airdrop } from "@/lib/types/airdrop";
import { EligibilityResult } from "@/lib/types/airdrop";
import { formatUSD, cn } from "@/lib/utils";
import { calculatePlatformFee, calculateUserAmount, formatFeeInfo } from "@/lib/contracts/fee-router";
import { Wallet, CheckCircle2, Loader2, Coins, ArrowRight, X } from "lucide-react";

interface ClaimAllModalProps {
  eligibleAirdrops: EligibilityResult[];
  isOpen: boolean;
  onClose: () => void;
}

export function ClaimAllModal({ eligibleAirdrops, isOpen, onClose }: ClaimAllModalProps) {
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const [claimState, setClaimState] = useState<"idle" | "preparing" | "claiming" | "success" | "error">("idle");
  const [currentClaim, setCurrentClaim] = useState<string>("");
  const [completedClaims, setCompletedClaims] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const totalValue = eligibleAirdrops.reduce((sum, r) => sum + (r.estimatedValue || 0), 0);
  const platformFee = totalValue * 0.02;
  const userAmount = totalValue - platformFee;

  const handleClaimAll = async () => {
    if (!connected || !publicKey) return;

    setClaimState("preparing");
    setErrorMessage(undefined);
    setCompletedClaims([]);

    try {
      // In production, this would:
      // 1. Build transactions for each claim
      // 2. Route through fee router contract
      // 3. Execute atomically or in batches
      
      for (const claim of eligibleAirdrops) {
        setCurrentClaim(claim.airdropId);
        setClaimState("claiming");
        
        // Simulate claim process (replace with actual contract interaction)
        await simulateClaim(claim);
        
        setCompletedClaims(prev => [...prev, claim.airdropId]);
        
        // Small delay between claims
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setClaimState("success");
    } catch (error) {
      setClaimState("error");
      setErrorMessage(error instanceof Error ? error.message : "Claim failed");
    }
  };

  const simulateClaim = async (claim: EligibilityResult): Promise<void> => {
    // This is a placeholder for actual contract interaction
    // In production:
    // 1. Fetch claim instruction from airdrop contract
    // 2. Wrap with fee router split instruction
    // 3. Sign and send transaction
    
    return new Promise((resolve) => setTimeout(resolve, 1500));
  };

  const getClaimStatus = (airdropId: string) => {
    if (completedClaims.includes(airdropId)) return "completed";
    if (currentClaim === airdropId) return "in-progress";
    return "pending";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-2xl font-bold">Claim All Airdrops</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {eligibleAirdrops.length} airdrops ready to claim
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {claimState === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="mx-auto h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">All Claims Completed!</h3>
                    <p className="text-muted-foreground mt-2">
                      Your tokens will arrive in your wallet shortly
                    </p>
                    <div className="mt-6 grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-lg font-bold">{formatUSD(totalValue)}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Platform Fee (2%)</p>
                        <p className="text-lg font-bold text-red-500">{formatUSD(platformFee)}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">You Receive</p>
                        <p className="text-lg font-bold text-green-500">{formatUSD(userAmount)}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Estimated Value</p>
                          <p className="text-2xl font-bold">{formatUSD(totalValue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">After 2% Fee</p>
                          <p className="text-2xl font-bold text-green-500">{formatUSD(userAmount)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Claims List */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {eligibleAirdrops.map((claim) => {
                        const status = getClaimStatus(claim.airdropId);
                        return (
                          <div
                            key={claim.airdropId}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              status === "completed" && "border-green-500 bg-green-50 dark:bg-green-900/20",
                              status === "in-progress" && "border-primary bg-primary/5",
                              status === "pending" && "border-border"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              {status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : status === "in-progress" ? (
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                              )}
                              <div>
                                <p className="font-medium">{claim.airdropName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatUSD(claim.estimatedValue)}
                                </p>
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-medium capitalize",
                              status === "completed" && "text-green-600",
                              status === "in-progress" && "text-primary",
                              status === "pending" && "text-muted-foreground"
                            )}>
                              {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Error Message */}
                    {errorMessage && (
                      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
                        {errorMessage}
                      </div>
                    )}
                    
                    {/* Action Button */}
                    {!connected ? (
                      <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 p-4 text-center">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Please connect your wallet to claim airdrops
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleClaimAll}
                        disabled={claimState === "claiming" || claimState === "preparing"}
                        className={cn(
                          "w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition-all",
                          claimState === "idle" || claimState === "preparing"
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                      >
                        {claimState === "preparing" ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Preparing Claims...
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2 h-5 w-5" />
                            Claim All ({eligibleAirdrops.length})
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                    
                    <p className="text-xs text-center text-muted-foreground">
                      By claiming, you agree to the 2% platform fee. Fees are only charged on successful claims.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
