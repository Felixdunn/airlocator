"use client";

import { WalletMultiButton as SolanaWalletButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export function WalletButton() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div 
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium"
        style={{ width: '120px', height: '40px', opacity: 0 }}
      >
        <span>Wallet</span>
      </div>
    );
  }

  return <SolanaWalletButton />;
}
