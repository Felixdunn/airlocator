"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Key, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Trash2,
  Database,
  Globe,
  Shield,
  Loader2,
  X
} from "lucide-react";
import { 
  getApiSettings, 
  saveApiSettings, 
  clearApiSettings,
  hasApiSettings,
  ApiSettings 
} from "@/lib/utils/cookies";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings>({});
  const [showPasswords, setShowPasswords] = useState({
    github: false,
    twitter: false,
    admin: false,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const current = getApiSettings();
    setSettings(current);
  }, []);

  const handleSave = () => {
    saveApiSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all API settings?")) {
      clearApiSettings();
      setSettings({});
      setTestResults({});
    }
  };

  const testConnection = async (type: 'github' | 'twitter' | 'solana') => {
    setTesting(type);
    
    try {
      let success = false;
      let message = '';

      if (type === 'github') {
        if (!settings.githubToken) {
          message = 'No GitHub token configured';
        } else {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${settings.githubToken}`,
            },
          });
          success = response.ok;
          message = success 
            ? 'GitHub API connected successfully' 
            : `GitHub API error: ${response.status}`;
        }
      } else if (type === 'twitter') {
        if (!settings.twitterBearerToken) {
          message = 'No Twitter token configured';
        } else {
          const response = await fetch('https://api.twitter.com/2/users/by/username/solana', {
            headers: {
              'Authorization': `Bearer ${settings.twitterBearerToken}`,
            },
          });
          success = response.ok;
          message = success 
            ? 'Twitter API connected successfully' 
            : `Twitter API error: ${response.status}`;
        }
      } else if (type === 'solana') {
        const rpcUrl = settings.solanaRpcUrl || 'https://api.mainnet-beta.solana.com';
        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getHealth',
            }),
          });
          const data = await response.json();
          success = data.result === 'ok' || !data.error;
          message = success 
            ? 'Solana RPC connected successfully' 
            : `Solana RPC error: ${data.error?.message || 'Unknown'}`;
        } catch (error) {
          success = false;
          message = `Solana RPC error: ${error instanceof Error ? error.message : 'Connection failed'}`;
        }
      }

      setTestResults(prev => ({
        ...prev,
        [type]: { success, message },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [type]: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Connection failed' 
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const apiStatus = hasApiSettings();

  if (!isClient) {
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
            <Settings className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">API Settings</span>
          </div>
          <a
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Close
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl p-6 mb-8",
            apiStatus.all 
              ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : "bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
          )}>
          <div className="flex items-start space-x-3">
            {apiStatus.all ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            )}
            <div>
              <h3 className={cn(
                "font-semibold",
                apiStatus.all ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200"
              )}>
                {apiStatus.all ? "All APIs Configured" : "Some APIs Not Configured"}
              </h3>
              <p className={cn(
                "text-sm mt-1",
                apiStatus.all ? "text-green-700 dark:text-green-300" : "text-yellow-700 dark:text-yellow-300"
              )}>
                {apiStatus.all 
                  ? "All API keys are configured. The scraper will use authenticated requests."
                  : "Configure API keys below to enable authenticated requests and higher rate limits."}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                  apiStatus.github 
                    ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {apiStatus.github ? "✓" : "○"} GitHub
                </span>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                  apiStatus.twitter 
                    ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {apiStatus.twitter ? "✓" : "○"} Twitter
                </span>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                  apiStatus.solanaRpc 
                    ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {apiStatus.solanaRpc ? "✓" : "○"} Solana RPC
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* GitHub Token */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold">GitHub Personal Access Token</h3>
                  <p className="text-sm text-muted-foreground">
                    Increases rate limit from 60 to 5,000 requests/hour
                  </p>
                </div>
              </div>
              <button
                onClick={() => testConnection('github')}
                disabled={testing === 'github' || !settings.githubToken}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium",
                  testing === 'github' 
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}>
                {testing === 'github' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-1" />
                    Test
                  </>
                )}
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPasswords.github ? 'text' : 'password'}
                  placeholder="ghp_..."
                  value={settings.githubToken || ''}
                  onChange={(e) => setSettings({ ...settings, githubToken: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, github: !showPasswords.github })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.github ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Create a token with 'repo' scope →
              </a>
            </div>
            
            {testResults.github && (
              <div className={cn(
                "mt-3 flex items-center space-x-2 rounded-lg px-3 py-2 text-sm",
                testResults.github.success 
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              )}>
                {testResults.github.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{testResults.github.message}</span>
              </div>
            )}
          </motion.div>

          {/* Twitter Bearer Token */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Twitter API Bearer Token</h3>
                  <p className="text-sm text-muted-foreground">
                    Enables Twitter airdrop discovery (1,500 tweets/month free)
                  </p>
                </div>
              </div>
              <button
                onClick={() => testConnection('twitter')}
                disabled={testing === 'twitter' || !settings.twitterBearerToken}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium",
                  testing === 'twitter' 
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}>
                {testing === 'twitter' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-1" />
                    Test
                  </>
                )}
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPasswords.twitter ? 'text' : 'password'}
                  placeholder="AAAAAAAAAAAAAAAAAAAA..."
                  value={settings.twitterBearerToken || ''}
                  onChange={(e) => setSettings({ ...settings, twitterBearerToken: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, twitter: !showPasswords.twitter })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.twitter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <a
                href="https://developer.twitter.com/en/portal/products/free"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Get a free Twitter API v2 token →
              </a>
            </div>
            
            {testResults.twitter && (
              <div className={cn(
                "mt-3 flex items-center space-x-2 rounded-lg px-3 py-2 text-sm",
                testResults.twitter.success 
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              )}>
                {testResults.twitter.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{testResults.twitter.message}</span>
              </div>
            )}
          </motion.div>

          {/* Solana RPC URL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Solana RPC URL</h3>
                  <p className="text-sm text-muted-foreground">
                    Custom RPC endpoint for wallet scanning (optional)
                  </p>
                </div>
              </div>
              <button
                onClick={() => testConnection('solana')}
                disabled={testing === 'solana'}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium",
                  testing === 'solana' 
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}>
                {testing === 'solana' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-1" />
                    Test
                  </>
                )}
              </button>
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="https://api.mainnet-beta.solana.com"
                value={settings.solanaRpcUrl || ''}
                onChange={(e) => setSettings({ ...settings, solanaRpcUrl: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the public RPC. For better performance, use Helius, QuickNode, or Moralis.
              </p>
            </div>
            
            {testResults.solana && (
              <div className={cn(
                "mt-3 flex items-center space-x-2 rounded-lg px-3 py-2 text-sm",
                testResults.solana.success 
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              )}>
                {testResults.solana.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{testResults.solana.message}</span>
              </div>
            )}
          </motion.div>

          {/* Admin Token */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-start space-x-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Admin Token</h3>
                <p className="text-sm text-muted-foreground">
                  Protects admin dashboard and manual scraper triggers
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="relative">
                <input
                  type={showPasswords.admin ? 'text' : 'password'}
                  placeholder="Enter a secure random string"
                  value={settings.adminToken || ''}
                  onChange={(e) => setSettings({ ...settings, adminToken: e.target.value })}
                  className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setShowPasswords({ ...showPasswords, admin: !showPasswords.admin })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.admin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                This token will be required for admin API endpoints. Store it securely.
              </p>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={handleClear}
              disabled={!apiStatus.all}
              className={cn(
                "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium",
                apiStatus.all
                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </button>
            
            <button
              onClick={handleSave}
              className={cn(
                "inline-flex items-center rounded-lg px-6 py-2 text-sm font-medium",
                saved
                  ? "bg-green-600 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 rounded-xl border border-border bg-muted p-6">
          <h3 className="font-semibold mb-4">Why configure API keys?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                GitHub Token
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 60 → 5,000 requests/hour</li>
                <li>• Access private repos</li>
                <li>• Better rate limits</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter Token
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 1,500 tweets/month</li>
                <li>• Real-time discovery</li>
                <li>• Higher confidence</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Custom RPC
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Faster responses</li>
                <li>• Higher rate limits</li>
                <li>• More reliable</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
