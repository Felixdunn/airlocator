// Gemini AI Integration for airdrop data enrichment
// Uses Google's Gemini API to extract structured data from raw content

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AirdropEnrichment {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  categories: string[];
  isOngoing: boolean;
  confidence: number;
  reasoning: string;
}

export interface EnrichmentResult {
  success: boolean;
  data?: AirdropEnrichment;
  error?: string;
}

// System prompt for Gemini AI
const SYSTEM_PROMPT = `You are an expert cryptocurrency airdrop analyst. Your task is to analyze raw content about potential airdrops and extract structured information.

Analyze the provided content and return a JSON object with the following fields:
- name: The official project name (string)
- symbol: The token ticker symbol, 3-5 uppercase letters (string)
- description: A clear, concise description of the airdrop (2-3 sentences max) (string)
- website: Official project website URL if found, null otherwise (string or null)
- twitter: Twitter/X handle (without @) if found, null otherwise (string or null)
- discord: Discord invite or server name if found, null otherwise (string or null)
- telegram: Telegram channel/group if found, null otherwise (string or null)
- categories: Array of relevant categories from: DeFi, NFTs, Gaming, Governance, Bridges, Testnets, Social, Infrastructure, DEX, Lending, Perpetuals, Oracle, Liquid Staking (string array)
- isOngoing: Boolean indicating if the airdrop is currently active/claimable (boolean)
- confidence: Your confidence in this being a legitimate airdrop (0.0 to 1.0) (number)
- reasoning: Brief explanation of your analysis (string)

Important rules:
1. Only mark isOngoing as true if there's clear evidence the airdrop is currently active or claims are open
2. Mark isOngoing as false if the airdrop has ended, is upcoming, or is unclear
3. Be conservative with confidence scores - only high confidence (0.8+) for clear airdrop announcements
4. Extract actual URLs and social handles from the content, don't fabricate
5. Keep descriptions factual and concise
6. If you cannot determine a field with confidence, use null or empty array

Respond ONLY with valid JSON, no additional text.`;

export async function enrichAirdropWithGemini(
  content: string,
  geminiApiKey: string
): Promise<EnrichmentResult> {
  if (!geminiApiKey) {
    return { success: false, error: 'Gemini API key not provided' };
  }

  if (!content || content.length < 50) {
    return { success: false, error: 'Content too short for analysis' };
  }

  try {
    const url = `${GEMINI_API_URL}?key=${geminiApiKey}`;
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nContent to analyze:\n${content.slice(0, 8000)}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    }, 15000); // 15 second timeout

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400) {
        return { success: false, error: 'Invalid request to Gemini API' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Gemini API rate limit exceeded' };
      }
      return { success: false, error: `Gemini API error: ${response.status}` };
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: false, error: 'No response from Gemini AI' };
    }

    const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
    
    // Validate required fields
    if (!parsed.name || !parsed.description) {
      return { success: false, error: 'Invalid response format from AI' };
    }

    return {
      success: true,
      data: {
        name: sanitizeString(parsed.name),
        symbol: sanitizeString(parsed.symbol || deriveSymbol(parsed.name)),
        description: sanitizeString(parsed.description),
        website: parsed.website ? sanitizeUrl(parsed.website) : null,
        twitter: parsed.twitter ? sanitizeString(parsed.twitter) : null,
        discord: parsed.discord ? sanitizeString(parsed.discord) : null,
        telegram: parsed.telegram ? sanitizeString(parsed.telegram) : null,
        categories: Array.isArray(parsed.categories) ? parsed.categories : ['DeFi'],
        isOngoing: Boolean(parsed.isOngoing),
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        reasoning: sanitizeString(parsed.reasoning || ''),
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Gemini API request timed out' };
      }
      if (error.message.includes('JSON')) {
        return { success: false, error: 'Failed to parse AI response' };
      }
      return { success: false, error: `Gemini API error: ${error.message}` };
    }
    return { success: false, error: 'Unknown error during AI enrichment' };
  }
}

// Utility functions
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 1000);
}

function sanitizeUrl(input: string): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function deriveSymbol(name: string): string {
  return name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
}

// Batch enrichment with progress tracking
export interface BatchEnrichmentOptions {
  geminiApiKey: string;
  onProgress?: (current: number, total: number, currentItem: string) => void;
}

export async function batchEnrichAirdrops(
  items: Array<{ id: string; content: string; title?: string }>,
  options: BatchEnrichmentOptions
): Promise<Array<{ id: string; result: EnrichmentResult }>> {
  const results: Array<{ id: string; result: EnrichmentResult }> = [];
  const total = items.length;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const currentItem = item.title || item.id;
    
    if (options.onProgress) {
      options.onProgress(i + 1, total, currentItem);
    }
    
    const result = await enrichAirdropWithGemini(item.content, options.geminiApiKey);
    results.push({ id: item.id, result });
    
    // Rate limiting: Gemini free tier has limits
    // Add small delay between requests
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}
