"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wallet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClaimButtonProps {
  airdropId: string;
  airdropName: string;
  estimatedValue?: number;
  eligible: boolean;
  claimUrl?: string;
  onClaim?: () => Promise<void>;
}

export function ClaimButton({
  airdropId,
  airdropName,
  estimatedValue,
  eligible,
  claimUrl,
  onClaim,
}: ClaimButtonProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleClaim = async () => {
    if (!eligible || !onClaim) return;

    setIsClaiming(true);
    setClaimStatus("processing");
    setErrorMessage(undefined);

    try {
      await onClaim();
      setClaimStatus("success");
    } catch (error) {
      setClaimStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Claim failed");
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculate fee info
  const feeInfo = estimatedValue 
    ? {
        platformFee: estimatedValue * 0.02,
        userAmount: estimatedValue * 0.98,
      }
    : null;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {claimStatus === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-lg bg-green-100 dark:bg-green-900/30 p-6 text-center"
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-green-800 dark:text-green-200">
              Claim Initiated!
            </h3>
            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
              You will receive {feeInfo ? `$${feeInfo.userAmount.toFixed(2)}` : "your tokens"}
              {feeInfo && ` (2% fee: $${feeInfo.platformFee.toFixed(2)})`}
            </p>
          </motion.div>
        ) : claimStatus === "error" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-lg bg-red-100 dark:bg-red-900/30 p-6 text-center"
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-red-800 dark:text-red-200">
              Claim Failed
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {errorMessage || "Something went wrong. Please try again."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Fee breakdown */}
            {feeInfo && eligible && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Fee Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Value</span>
                    <span className="text-foreground">${estimatedValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (2%)</span>
                    <span className="text-red-500">-${feeInfo.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-medium text-foreground">You Receive</span>
                    <span className="font-semibold text-green-600">${feeInfo.userAmount.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  No fee if claim fails. Only pay on success.
                </p>
              </div>
            )}

            {/* Claim button */}
            <button
              onClick={handleClaim}
              disabled={!eligible || isClaiming || !claimUrl}
              className={cn(
                "w-full inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition-all duration-300",
                eligible && !isClaiming && claimUrl
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Claim...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-5 w-5" />
                  {claimUrl ? "Claim Airdrop" : "Claiming Soon"}
                </>
              )}
            </button>

            {!eligible && (
              <p className="text-sm text-center text-muted-foreground">
                Connect your wallet to check eligibility
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
