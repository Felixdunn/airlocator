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
  X,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getApiSettings, 
  saveApiSettings, 
  clearApiSettings,
  hasApiSettings,
  ApiSettings 
} from "@/lib/utils/cookies";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings & { geminiApiKey?: string }>({});
  const [showPasswords, setShowPasswords] = useState({
    github: false,
    twitter: false,
    admin: false,
    gemini: false,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const current = getApiSettings();
    setSettings({
      ...current,
      geminiApiKey: getCookie('api_gemini_key') || undefined,
    });
  }, []);

  const handleSave = () => {
    saveApiSettings(settings);
    if (settings.geminiApiKey) {
      setCookie('api_gemini_key', settings.geminiApiKey, 30);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all API settings?")) {
      clearApiSettings();
      deleteCookie('api_gemini_key');
      setSettings({});
      setTestResults({});
    }
  };

  const testConnection = async (type: 'github' | 'twitter' | 'solana' | 'gemini') => {
    setTesting(type);
    
    try {
      let success = false;
      let message = '';

      if (type === 'github') {
        if (!settings.githubToken) {
          message = 'No GitHub token configured';
        } else {
          const response = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `token ${settings.githubToken}` },
          });
          success = response.ok;
          message = success ? 'GitHub API connected successfully' : `GitHub API error: ${response.status}`;
        }
      } else if (type === 'twitter') {
        if (!settings.twitterBearerToken) {
          message = 'No Twitter token configured';
        } else {
          const response = await fetch('https://api.twitter.com/2/users/by/username/solana', {
            headers: { 'Authorization': `Bearer ${settings.twitterBearerToken}` },
          });
          success = response.ok;
          message = success ? 'Twitter API connected successfully' : `Twitter API error: ${response.status}`;
        }
      } else if (type === 'solana') {
        const rpcUrl = settings.solanaRpcUrl || 'https://api.mainnet-beta.solana.com';
        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
          });
          const data = await response.json();
          success = data.result === 'ok' || !data.error;
          message = success ? 'Solana RPC connected successfully' : `Solana RPC error: ${data.error?.message || 'Unknown'}`;
        } catch (error) {
          success = false;
          message = `Solana RPC error: ${error instanceof Error ? error.message : 'Connection failed'}`;
        }
      } else if (type === 'gemini') {
        if (!settings.geminiApiKey) {
          message = 'No Gemini API key configured';
        } else {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Respond with just "OK"' }] }],
              }),
            }
          );
          if (response.ok) {
            const data = await response.json();
            success = !!data.candidates?.[0]?.content?.parts?.[0]?.text;
            message = 'Gemini AI connected successfully';
          } else {
            success = false;
            message = `Gemini API error: ${response.status}`;
          }
        }
      }

      setTestResults(prev => ({ ...prev, [type]: { success, message } }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [type]: { success: false, message: error instanceof Error ? error.message : 'Connection failed' } 
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
          <a href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
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
              <h3 className={cn("font-semibold", apiStatus.all ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200")}>
                {apiStatus.all ? "All APIs Configured" : "Some APIs Not Configured"}
              </h3>
              <p className={cn("text-sm mt-1", apiStatus.all ? "text-green-700 dark:text-green-300" : "text-yellow-700 dark:text-yellow-300")}>
                {apiStatus.all 
                  ? "All API keys are configured for optimal performance."
                  : "Configure API keys below to enable authenticated requests and AI enrichment."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Gemini API Key - NEW */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Gemini AI API Key</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered airdrop enrichment: extracts names, descriptions, socials, and verifies if airdrops are ongoing
                </p>
              </div>
            </div>
            <button
              onClick={() => testConnection('gemini')}
              disabled={testing === 'gemini' || !settings.geminiApiKey}
              className={cn(
                "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium",
                testing === 'gemini' 
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}>
              {testing === 'gemini' ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Testing...</>
              ) : (
                <><Zap className="h-4 w-4 mr-1" />Test</>
              )}
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPasswords.gemini ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={settings.geminiApiKey || ''}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setShowPasswords({ ...showPasswords, gemini: !showPasswords.gemini })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Get a free Gemini API key from Google AI Studio →
            </a>
            {testResults.gemini && (
              <div className={cn(
                "mt-2 flex items-center space-x-2 rounded-lg px-3 py-2 text-sm",
                testResults.gemini.success 
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              )}>
                {testResults.gemini.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{testResults.gemini.message}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* GitHub Token */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 mb-6"
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
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Testing...</>
              ) : (
                <><Key className="h-4 w-4 mr-1" />Test</>
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
        </motion.div>

        {/* Twitter Bearer Token */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 mb-6"
        >
          {/* ... Twitter section (similar structure) ... */}
        </motion.div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleClear}
            disabled={!apiStatus.all && !settings.geminiApiKey}
            className={cn(
              "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium",
              apiStatus.all || settings.geminiApiKey
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
              <><CheckCircle2 className="h-4 w-4 mr-2" />Saved!</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Settings</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

// Cookie helpers
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}
