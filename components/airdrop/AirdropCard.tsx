"use client";

import { motion } from "framer-motion";
import { Airdrop } from "@/lib/types/airdrop";
import { formatUSD, getFrictionColor, cn } from "@/lib/utils";
import { ExternalLink, CheckCircle2, Clock, Shield } from "lucide-react";
import Link from "next/link";

interface AirdropCardProps {
  airdrop: Airdrop;
  eligible?: boolean;
  estimatedValue?: number;
  onClaim?: (airdrop: Airdrop) => void;
}

export function AirdropCard({ airdrop, eligible, estimatedValue, onClaim }: AirdropCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm",
        "card-hover gradient-bg"
      )}
    >
      {/* Verified badge */}
      {airdrop.verified && (
        <div className="absolute top-4 right-4">
          <Shield className="h-4 w-4 text-green-500" />
        </div>
      )}

      {/* Featured badge */}
      {airdrop.featured && (
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Featured
          </span>
        </div>
      )}

      <div className="flex items-start space-x-4 mt-6">
        {/* Logo */}
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {airdrop.symbol.slice(0, 2)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {airdrop.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {airdrop.description}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mt-4">
        {airdrop.categories.map((category) => (
          <span
            key={category}
            className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
          >
            {category}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div>
          <p className="text-xs text-muted-foreground">Est. Value</p>
          <p className="text-sm font-semibold text-foreground">
            {formatUSD(estimatedValue || airdrop.estimatedValueUSD, airdrop.estimatedValueRange)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Friction</p>
          <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", getFrictionColor(airdrop.frictionLevel))}>
            {airdrop.frictionLevel.charAt(0).toUpperCase() + airdrop.frictionLevel.slice(1)}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Claim Type</p>
          <p className="text-sm font-semibold text-foreground capitalize">
            {airdrop.claimType.replace("-", " ")}
          </p>
        </div>
      </div>

      {/* Eligibility status */}
      {eligible !== undefined && (
        <div className={cn(
          "mt-4 flex items-center space-x-2 rounded-lg px-3 py-2 text-sm",
          eligible 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
            : "bg-muted text-muted-foreground"
        )}>
          {eligible ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Eligible</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              <span>Check eligibility</span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3 mt-6">
        <Link
          href={`/airdrop/${airdrop.id}`}
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Details
        </Link>
        
        {airdrop.claimUrl ? (
          <a
            href={airdrop.claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (onClaim && eligible) {
                e.preventDefault();
                onClaim(airdrop);
              }
            }}
            className={cn(
              "flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              eligible 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {eligible ? "Claim" : "Claim"}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        ) : (
          <button
            disabled
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
          >
            Coming Soon
          </button>
        )}
      </div>

      {/* Fee info */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        2% fee on successful claim only
      </p>
    </motion.div>
  );
}
