"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Coins, Menu, X } from "lucide-react";
import { useState } from "react";
import { WalletButton } from "@/components/wallet/WalletButton";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Coins className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl gradient-text">Airdrop Tracker</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/#airdrops" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Live Airdrops
          </Link>
          <Link href="/solana-airdrop-checker" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Checker
          </Link>
          <Link href="/how-to-claim-solana-airdrops" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Guide
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <WalletButton />
          
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-border"
        >
          <nav className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <Link href="/#airdrops" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Live Airdrops
            </Link>
            <Link href="/solana-airdrop-checker" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Checker
            </Link>
            <Link href="/how-to-claim-solana-airdrops" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Guide
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
