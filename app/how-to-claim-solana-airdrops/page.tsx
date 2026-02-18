import { Metadata } from "next";
import { BookOpen, Wallet, Coins, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Claim Solana Airdrops - Complete Guide 2025",
  description: "Step-by-step guide to claiming Solana airdrops. Learn how to check eligibility, connect your wallet, and claim free tokens safely.",
  keywords: ["how to claim solana airdrops", "solana airdrop guide", "claim crypto airdrops", "solana tutorial"],
  openGraph: {
    title: "How to Claim Solana Airdrops",
    description: "Complete guide to claiming Solana airdrops",
    type: "article",
  },
};

export default function HowToClaimPage() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-4">
              <BookOpen className="mr-2 h-4 w-4" />
              Guide
            </div>
            <h1 className="text-4xl font-bold">How to Claim Solana Airdrops</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete step-by-step guide to finding and claiming free tokens on Solana
            </p>
          </div>
          
          {/* Table of Contents */}
          <div className="rounded-xl border border-border bg-card p-6 mb-12">
            <h2 className="font-semibold mb-4">Table of Contents</h2>
            <ul className="space-y-2">
              <li>
                <a href="#what-are-airdrops" className="text-primary hover:underline">
                  What Are Airdrops?
                </a>
              </li>
              <li>
                <a href="#prerequisites" className="text-primary hover:underline">
                  Prerequisites
                </a>
              </li>
              <li>
                <a href="#step-by-step" className="text-primary hover:underline">
                  Step-by-Step Claiming Process
                </a>
              </li>
              <li>
                <a href="#safety" className="text-primary hover:underline">
                  Safety Tips
                </a>
              </li>
              <li>
                <a href="#faq" className="text-primary hover:underline">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          
          {/* Content */}
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <section id="what-are-airdrops" className="mb-12">
              <h2 className="text-2xl font-bold mb-4">What Are Airdrops?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Airdrops are free token distributions by blockchain projects to reward early users, 
                increase adoption, or decentralize token ownership. Solana projects frequently use 
                airdrops to reward users who have interacted with their protocols before launching 
                a token.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Recent notable Solana airdrops include Jupiter (JUP), Jito (JTO), Pyth Network (PYTH), 
                and Wormhole (W), with some users receiving thousands of dollars worth of tokens.
              </p>
            </section>
            
            <section id="prerequisites" className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Prerequisites</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Solana Wallet",
                    description: "Install Phantom, Solflare, or another Solana-compatible wallet",
                  },
                  {
                    title: "SOL for Gas",
                    description: "Keep some SOL in your wallet for transaction fees",
                  },
                  {
                    title: "On-Chain Activity",
                    description: "Interact with DeFi protocols, NFT marketplaces, and bridges",
                  },
                  {
                    title: "Patience",
                    description: "Airdrop hunting is a long-term strategy, not get-rich-quick",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border bg-card p-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
            
            <section id="step-by-step" className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Step-by-Step Claiming Process</h2>
              
              <div className="space-y-8">
                {[
                  {
                    step: 1,
                    title: "Connect Your Wallet",
                    content: "Click 'Connect Wallet' in the top right corner and choose your wallet provider. This allows us to scan your on-chain activity.",
                  },
                  {
                    step: 2,
                    title: "Check Eligibility",
                    content: "Our system automatically scans your wallet and shows which airdrops you're eligible for based on your transaction history.",
                  },
                  {
                    step: 3,
                    title: "Review Airdrops",
                    content: "Browse the list of eligible airdrops. Each shows estimated value, claim deadline, and friction level (how easy it is to claim).",
                  },
                  {
                    step: 4,
                    title: "Claim Tokens",
                    content: "Click 'Claim' on any airdrop. You'll be redirected to the official claim page. Complete any required steps (signature, transaction).",
                  },
                  {
                    step: 5,
                    title: "Receive Tokens",
                    content: "Once claimed, tokens are sent to your wallet. Our 2% fee is automatically deducted. No claim = no fee.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {item.step}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <p className="text-muted-foreground mt-2">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            <section id="safety" className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Safety Tips</h2>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-6">
                <ul className="space-y-3">
                  {[
                    "Never share your seed phrase or private keys",
                    "Always verify you're on the official claim page",
                    "Check the contract address before signing",
                    "Be wary of airdrops asking for upfront payments",
                    "Use a burner wallet for high-risk interactions",
                    "Our platform never takes custody of your funds",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            
            <section id="faq" className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Are airdrops taxable?</h3>
                  <p className="text-muted-foreground">
                    Yes, in most jurisdictions airdrops are considered taxable income at the time 
                    of receipt. Consult a tax professional for advice specific to your situation.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">How much can I earn from airdrops?</h3>
                  <p className="text-muted-foreground">
                    Airdrop values vary widely from $10 to $10,000+. It depends on your activity 
                    level, which protocols you use, and luck. Active users can earn significant amounts.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">What if I miss an airdrop?</h3>
                  <p className="text-muted-foreground">
                    Some airdrops have multiple rounds. Even if you miss one, continue using 
                    protocols - future airdrops may reward past activity.
                  </p>
                </div>
              </div>
            </section>
          </article>
          
          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-8 text-center">
            <h2 className="text-2xl font-bold text-white">Ready to Start Claiming?</h2>
            <p className="mt-2 text-white/80">
              Connect your wallet and check your eligibility for live Solana airdrops
            </p>
            <Link
              href="/#airdrops"
              className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-medium text-primary hover:bg-white/90 transition-colors"
            >
              Browse Airdrops
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
