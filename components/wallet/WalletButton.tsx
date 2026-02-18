"use client";

import dynamic from "next/dynamic";

// Dynamically import wallet button with no SSR to prevent hydration issues
const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { 
    ssr: false,
    loading: () => (
      <div className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground animate-pulse">
        Connect Wallet
      </div>
    )
  }
);

export function WalletButton() {
  return <WalletMultiButtonDynamic />;
}
