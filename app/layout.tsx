import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProviders } from "@/components/providers/WalletProviders";
import { Header } from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solana Airdrop Tracker - Find & Claim Free SOL Tokens",
  description: "Discover live Solana airdrops, check your eligibility, and claim rewards instantly. Non-custodial, no login required. Only pay a small fee when you successfully claim.",
  keywords: ["solana", "airdrop", "crypto", "SOL", "tokens", "DeFi", "NFT", "free crypto"],
  authors: [{ name: "Solana Airdrop Tracker" }],
  openGraph: {
    title: "Solana Airdrop Tracker",
    description: "Find and claim Solana airdrops instantly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solana Airdrop Tracker",
    description: "Find and claim Solana airdrops instantly",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <WalletProviders>
          <div className="min-h-screen bg-background antialiased">
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border py-8 mt-20">
              <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                <p>© 2025 Solana Airdrop Tracker. Non-custodial. No custody of funds.</p>
                <p className="mt-2">Fee: 2% on successful claims only. No claim = no fee.</p>
              </div>
            </footer>
          </div>
        </WalletProviders>
      </body>
    </html>
  );
}
