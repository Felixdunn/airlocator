// Admin Dashboard for managing discovered airdrops
// Protected route - requires admin authentication

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Trash2,
  Edit,
  Search,
  Filter,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Airdrop {
  id: string;
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter?: string;
  claimUrl?: string;
  categories: string[];
  status: "live" | "upcoming" | "ended" | "unverified";
  verified: boolean;
  featured: boolean;
  estimatedValueUSD?: number;
  discoveredAt: string;
  sources: Array<{
    type: string;
    url: string;
    confidence: number;
  }>;
}

interface ScraperStatus {
  lastRun: {
    success: boolean;
    timestamp: string;
    newAirdrops: number;
    updatedAirdrops: number;
    errors: string[];
  } | null;
  stats: {
    totalAirdrops: number;
    liveAirdrops: number;
    verifiedAirdrops: number;
    unverifiedAirdrops: number;
  };
  nextScheduledRun: string;
}

export default function AdminDashboard() {
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningScraper, setRunningScraper] = useState(false);
  const [filter, setFilter] = useState<"all" | "unverified" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAirdrop, setSelectedAirdrop] = useState<Airdrop | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch scraper status
      const statusResponse = await fetch("/api/scraper/status");
      const statusData = await statusResponse.json();
      setScraperStatus(statusData.data);
      
      // Fetch all airdrops
      const airdropsResponse = await fetch("/api/airdrops");
      const airdropsData = await airdropsResponse.json();
      setAirdrops(airdropsData.data || []);
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runScraper = async () => {
    try {
      setRunningScraper(true);
      
      const response = await fetch("/api/scraper/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Scraper completed: ${result.data.newAirdrops} new, ${result.data.updatedAirdrops} updated`);
        fetchDashboardData();
      } else {
        alert(`Scraper failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Scraper error:", error);
      alert("Failed to run scraper");
    } finally {
      setRunningScraper(false);
    }
  };

  const updateAirdropStatus = async (id: string, updates: Partial<Airdrop>) => {
    try {
      const response = await fetch(`/api/airdrops/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        fetchDashboardData();
        setShowActionMenu(false);
        setSelectedAirdrop(null);
      } else {
        alert("Failed to update airdrop");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update airdrop");
    }
  };

  const deleteAirdrop = async (id: string) => {
    if (!confirm("Are you sure you want to delete this airdrop?")) return;
    
    try {
      const response = await fetch(`/api/airdrops/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        fetchDashboardData();
        setShowActionMenu(false);
        setSelectedAirdrop(null);
      } else {
        alert("Failed to delete airdrop");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete airdrop");
    }
  };

  const filteredAirdrops = airdrops.filter(airdrop => {
    if (filter === "unverified" && airdrop.status !== "unverified") return false;
    if (filter === "verified" && !airdrop.verified) return false;
    if (searchQuery && !airdrop.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Admin Dashboard</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Airdrops</p>
                <p className="text-3xl font-bold mt-1">{scraperStatus?.stats.totalAirdrops || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Airdrops</p>
                <p className="text-3xl font-bold mt-1">{scraperStatus?.stats.liveAirdrops || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unverified</p>
                <p className="text-3xl font-bold mt-1">{scraperStatus?.stats.unverifiedAirdrops || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-3xl font-bold mt-1">{scraperStatus?.stats.verifiedAirdrops || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </motion.div>
        </div>

        {/* Scraper Controls */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Scraper Status</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {scraperStatus?.lastRun 
                  ? `Last run: ${new Date(scraperStatus.lastRun.timestamp).toLocaleString()}`
                  : "No runs yet"}
              </p>
              {scraperStatus?.lastRun && (
                <p className="text-sm text-muted-foreground mt-1">
                  {scraperStatus.lastRun.newAirdrops} new, {scraperStatus.lastRun.updatedAirdrops} updated
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next scheduled run</p>
                <p className="text-sm font-medium">
                  {scraperStatus?.nextScheduledRun 
                    ? new Date(scraperStatus.nextScheduledRun).toLocaleString()
                    : "Not scheduled"}
                </p>
              </div>
              <button
                onClick={runScraper}
                disabled={runningScraper}
                className={cn(
                  "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium",
                  runningScraper
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {runningScraper ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Now
                  </>
                )}
              </button>
            </div>
          </div>
          
          {scraperStatus?.lastRun?.errors && scraperStatus.lastRun.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Errors from last run:</p>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {scraperStatus.lastRun.errors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search airdrops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredAirdrops.length} airdrops
          </p>
        </div>

        {/* Airdrops Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Categories</th>
                <th className="text-left p-4 font-medium">Est. Value</th>
                <th className="text-left p-4 font-medium">Source</th>
                <th className="text-left p-4 font-medium">Discovered</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAirdrops.map((airdrop) => (
                <tr key={airdrop.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{airdrop.name}</p>
                      <p className="text-xs text-muted-foreground">{airdrop.symbol}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        airdrop.status === "live" && "bg-green-100 text-green-700",
                        airdrop.status === "upcoming" && "bg-blue-100 text-blue-700",
                        airdrop.status === "ended" && "bg-gray-100 text-gray-700",
                        airdrop.status === "unverified" && "bg-yellow-100 text-yellow-700"
                      )}>
                        {airdrop.status}
                      </span>
                      {airdrop.verified && (
                        <Shield className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {airdrop.categories.slice(0, 2).map(cat => (
                        <span key={cat} className="text-xs bg-secondary px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                      {airdrop.categories.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{airdrop.categories.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {airdrop.estimatedValueUSD 
                      ? `$${airdrop.estimatedValueUSD}`
                      : "TBD"}
                  </td>
                  <td className="p-4">
                    {airdrop.sources[0] && (
                      <a
                        href={airdrop.sources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center"
                      >
                        {airdrop.sources[0].type}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(airdrop.discoveredAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {!airdrop.verified && (
                        <button
                          onClick={() => updateAirdropStatus(airdrop.id, { verified: true, status: "live" })}
                          className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                          title="Verify"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAirdrop(airdrop);
                          setShowActionMenu(true);
                        }}
                        className="p-2 rounded-lg hover:bg-accent"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteAirdrop(airdrop.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAirdrops.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No airdrops found</p>
            </div>
          )}
        </div>
      </main>

      {/* Action Menu Modal */}
      {showActionMenu && selectedAirdrop && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Airdrop</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="text-sm text-muted-foreground">{selectedAirdrop.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Website</label>
                <a 
                  href={selectedAirdrop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {selectedAirdrop.website}
                </a>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => updateAirdropStatus(selectedAirdrop.id, { 
                    verified: !selectedAirdrop.verified,
                    status: !selectedAirdrop.verified ? "live" : "unverified"
                  })}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
                    selectedAirdrop.verified
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  )}
                >
                  {selectedAirdrop.verified ? "Unverify" : "Verify"}
                </button>
                
                <button
                  onClick={() => updateAirdropStatus(selectedAirdrop.id, { 
                    featured: !selectedAirdrop.featured 
                  })}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
                    selectedAirdrop.featured
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {selectedAirdrop.featured ? "Unfeature" : "Feature"}
                </button>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowActionMenu(false);
                    setSelectedAirdrop(null);
                  }}
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <a
                  href={selectedAirdrop.claimUrl || selectedAirdrop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium text-center hover:bg-primary/90"
                >
                  View Details
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
