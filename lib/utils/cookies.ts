// Cookie utilities for storing settings client-side

export function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const expiresAttr = `expires=${expires.toUTCString()}`;
  document.cookie = `${name}=${encodeURIComponent(value)};${expiresAttr};path=/;SameSite=Strict;Secure`;
}

export function getCookie(name: string): string | null {
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

export function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}

// API Keys interface
export interface ApiSettings {
  githubToken?: string;
  twitterBearerToken?: string;
  solanaRpcUrl?: string;
  adminToken?: string;
  geminiApiKey?: string;
}

export function saveApiSettings(settings: ApiSettings) {
  if (settings.githubToken) setCookie('api_github_token', settings.githubToken, 30);
  if (settings.twitterBearerToken) setCookie('api_twitter_token', settings.twitterBearerToken, 30);
  if (settings.solanaRpcUrl) setCookie('api_solana_rpc', settings.solanaRpcUrl, 30);
  if (settings.adminToken) setCookie('api_admin_token', settings.adminToken, 30);
  if (settings.geminiApiKey) setCookie('api_gemini_key', settings.geminiApiKey, 30);
}

export function getApiSettings(): ApiSettings {
  return {
    githubToken: getCookie('api_github_token') || undefined,
    twitterBearerToken: getCookie('api_twitter_token') || undefined,
    solanaRpcUrl: getCookie('api_solana_rpc') || undefined,
    adminToken: getCookie('api_admin_token') || undefined,
    geminiApiKey: getCookie('api_gemini_key') || undefined,
  };
}

export function clearApiSettings() {
  deleteCookie('api_github_token');
  deleteCookie('api_twitter_token');
  deleteCookie('api_solana_rpc');
  deleteCookie('api_admin_token');
  deleteCookie('api_gemini_key');
}

export function hasApiSettings(): {
  all: boolean;
  github: boolean;
  twitter: boolean;
  solanaRpc: boolean;
  admin: boolean;
  gemini: boolean;
} {
  const settings = getApiSettings();
  return {
    all: !!(settings.githubToken && settings.twitterBearerToken && settings.solanaRpcUrl && settings.geminiApiKey),
    github: !!settings.githubToken,
    twitter: !!settings.twitterBearerToken,
    solanaRpc: !!settings.solanaRpcUrl,
    admin: !!settings.adminToken,
    gemini: !!settings.geminiApiKey,
  };
}
