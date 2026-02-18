import { Metadata } from "next";
import { WalletScannerComponent } from "@/components/airdrop/WalletScanner";
import { airdrops } from "@/lib/data/airdrops";
import { CheckCircle2, Wallet, Search, Coins } from "lucide-react";

export const metadata: Metadata = {
  title: "Solana Airdrop Checker - Check Your Eligibility Instantly",
  description: "Free Solana airdrop checker. Connect your wallet to see which airdrops you're eligible for. Scan your on-chain activity and claim free tokens instantly.",
  keywords: ["solana airdrop checker", "check solana airdrops", "solana eligibility", "free crypto checker"],
  openGraph: {
    title: "Solana Airdrop Checker",
    description: "Check which Solana airdrops you're eligible for",
    type: "website",
  },
};

export default function AirdropCheckerPage() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold">Solana Airdrop Checker</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Check your wallet for eligible Solana airdrops in seconds
            </p>
          </div>
          
          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Wallet,
                title: "Connect Wallet",
                description: "Securely connect your Solana wallet. We never take custody of your funds.",
              },
              {
                icon: Search,
                title: "Automatic Scan",
                description: "We scan your on-chain activity against all live airdrop requirements.",
              },
              {
                icon: Coins,
                title: "View Results",
                description: "See exactly which airdrops you can claim and their estimated value.",
              },
            ].map((step) => (
              <div key={step.title} className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
          
          {/* Scanner */}
          <WalletScannerComponent />
          
          {/* Supported Airdrops */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Supported Airdrops</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">Airdrop</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Est. Value</th>
                    <th className="text-left p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {airdrops.filter(a => a.live).map((airdrop) => (
                    <tr key={airdrop.id} className="border-t border-border">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs">
                            {airdrop.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{airdrop.name}</p>
                            <p className="text-xs text-muted-foreground">{airdrop.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {airdrop.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="text-xs bg-secondary px-2 py-1 rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {airdrop.estimatedValueUSD 
                          ? `$${airdrop.estimatedValueUSD}`
                          : airdrop.estimatedValueRange
                          ? `$${airdrop.estimatedValueRange.min} - $${airdrop.estimatedValueRange.max}`
                          : "TBD"}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center text-green-600 text-sm">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Live
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">How does the airdrop checker work?</h3>
                <p className="text-muted-foreground">
                  Our checker scans your wallet&apos;s on-chain activity including program interactions, 
                  token holdings, NFT ownership, and transaction history. It then matches this data 
                  against known airdrop eligibility criteria to determine which airdrops you can claim.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is this safe? Do you custody my funds?</h3>
                <p className="text-muted-foreground">
                  No. We never take custody of your funds. The scanner is read-only and only analyzes 
                  your public on-chain activity. When you claim airdrops, tokens go directly to your 
                  wallet through our fee router contract.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What does the 2% fee mean?</h3>
                <p className="text-muted-foreground">
                  We only charge a 2% fee when you successfully claim an airdrop. If the claim fails 
                  for any reason, you pay nothing. The fee is automatically deducted from the claimed 
                  amount through our smart contract.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">How often are new airdrops added?</h3>
                <p className="text-muted-foreground">
                  We continuously monitor GitHub, protocol blogs, Twitter, and RSS feeds for new 
                  airdrop announcements. New verified airdrops are added as soon as they&apos;re 
                  announced.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
