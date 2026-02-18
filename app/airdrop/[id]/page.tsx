import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAirdropById, getLiveAirdrops } from "@/lib/data/airdrops";
import { AirdropCard } from "@/components/airdrop/AirdropCard";
import { ClaimButton } from "@/components/airdrop/ClaimButton";
import { WalletScannerComponent } from "@/components/airdrop/WalletScanner";
import { formatUSD, formatDate } from "@/lib/utils";
import { ExternalLink, Calendar, Link as LinkIcon, Twitter, BookOpen, Shield, Coins } from "lucide-react";
import Link from "next/link";

interface AirdropPageProps {
  params: {
    id: string;
  };
}

export async function generateStaticParams() {
  const airdrops = getLiveAirdrops();
  return airdrops.map((airdrop) => ({
    id: airdrop.id,
  }));
}

export async function generateMetadata({ params }: AirdropPageProps): Promise<Metadata> {
  const airdrop = getAirdropById(params.id);
  
  if (!airdrop) {
    return {
      title: "Airdrop Not Found",
    };
  }
  
  return {
    title: `${airdrop.name} (${airdrop.symbol}) Airdrop - Claim Guide & Eligibility`,
    description: airdrop.description,
    openGraph: {
      title: `${airdrop.name} Airdrop`,
      description: airdrop.description,
      type: "website",
    },
  };
}

export default function AirdropPage({ params }: AirdropPageProps) {
  const airdrop = getAirdropById(params.id);
  
  if (!airdrop) {
    notFound();
  }
  
  const estimatedValue = airdrop.estimatedValueUSD 
    || (airdrop.estimatedValueRange 
      ? (airdrop.estimatedValueRange.min + airdrop.estimatedValueRange.max) / 2 
      : undefined);
  
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/#airdrops" className="hover:text-foreground">
                Airdrops
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{airdrop.name}</li>
          </ol>
        </nav>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="flex items-start space-x-6">
                <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {airdrop.symbol.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold">{airdrop.name}</h1>
                    {airdrop.verified && (
                      <Shield className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-2">{airdrop.symbol}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {airdrop.categories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center rounded-md bg-secondary px-3 py-1 text-sm font-medium"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="mt-6 text-lg text-foreground leading-relaxed">
                {airdrop.description}
              </p>
              
              {/* Links */}
              <div className="flex flex-wrap gap-4 mt-6">
                <a
                  href={airdrop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Website
                </a>
                {airdrop.twitter && (
                  <a
                    href={airdrop.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline"
                  >
                    <Twitter className="mr-2 h-4 w-4" />
                    Twitter
                  </a>
                )}
                {airdrop.blog && (
                  <a
                    href={airdrop.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Blog
                  </a>
                )}
                {airdrop.claimUrl && (
                  <a
                    href={airdrop.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Claim Page
                  </a>
                )}
              </div>
            </div>
            
            {/* Eligibility Rules */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <h2 className="text-2xl font-bold mb-6">Eligibility Requirements</h2>
              <div className="space-y-4">
                {airdrop.rules.requiredPrograms && (
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Program Interaction</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Must have interacted with required protocols
                      </p>
                    </div>
                  </div>
                )}
                {airdrop.rules.minTransactions && (
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Minimum Transactions</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        At least {airdrop.rules.minTransactions} transactions required
                      </p>
                    </div>
                  </div>
                )}
                {airdrop.rules.earliestTransaction && (
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Activity Period</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Activity must be after {formatDate(airdrop.rules.earliestTransaction)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Wallet Scanner */}
            <WalletScannerComponent />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Claim Card */}
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-bold mb-4">Claim Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Value</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatUSD(estimatedValue, airdrop.estimatedValueRange)}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Claim Type</p>
                    <p className="font-medium capitalize">{airdrop.claimType.replace("-", " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Friction</p>
                    <p className="font-medium capitalize">{airdrop.frictionLevel}</p>
                  </div>
                </div>
                
                {airdrop.claimDeadline && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Ends: {formatDate(airdrop.claimDeadline)}</span>
                  </div>
                )}
                
                <div className="border-t border-border pt-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span>Platform Fee: 2%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only charged on successful claim
                  </p>
                </div>
                
                <ClaimButton
                  airdropId={airdrop.id}
                  airdropName={airdrop.name}
                  estimatedValue={estimatedValue}
                  eligible={true}
                  claimUrl={airdrop.claimUrl}
                />
              </div>
            </div>
            
            {/* Related Airdrops */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-4">Related Airdrops</h3>
              <div className="space-y-4">
                {getLiveAirdrops()
                  .filter(a => a.id !== airdrop.id && a.categories.some(c => airdrop.categories.includes(c)))
                  .slice(0, 3)
                  .map(related => (
                    <Link
                      key={related.id}
                      href={`/airdrop/${related.id}`}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
                        {related.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{related.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatUSD(related.estimatedValueUSD, related.estimatedValueRange)}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
