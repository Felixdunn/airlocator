// Gemini AI Integration for airdrop data enrichment
// Simplified: extracts only title, short description, and website

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AirdropEnrichment {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  isOngoing: boolean;
  confidence: number;
}

export interface EnrichmentResult {
  success: boolean;
  data?: AirdropEnrichment;
  error?: string;
}

// Simplified system prompt for clean plaintext output
const SYSTEM_PROMPT = `You are an airdrop data extractor. Analyze the content and extract ONLY these fields in plain text format:

Format your response EXACTLY like this:
NAME: [project name]
SYMBOL: [3-5 letter ticker]
DESCRIPTION: [one short sentence, max 15 words]
WEBSITE: [url if found, or NONE]
TWITTER: [@handle if found, or NONE]
DISCORD: [invite if found, or NONE]
TELEGRAM: [link if found, or NONE]
ONGOING: [YES or NO]
CONFIDENCE: [0.0 to 1.0]

Rules:
1. NAME: Extract from <title> tags, headings, or first mention
2. SYMBOL: Uppercase, 3-5 letters (e.g., JUP, JTO, ARB)
3. DESCRIPTION: One short sentence, max 15 words, no fluff
4. WEBSITE: Look for <a href>, domain URLs, "visit" links
5. SOCIALS: Look for @handles, discord.gg/, t.me/ links
6. ONGOING: YES only if "claim now", "live", "active" mentioned
7. CONFIDENCE: 0.9+ for official announcements, 0.5+ for rumors

Respond in PLAINTEXT only, no JSON, no markdown, no explanations.`;

export async function enrichAirdropWithGemini(
  content: string,
  geminiApiKey: string
): Promise<EnrichmentResult> {
  if (!geminiApiKey) {
    return { success: false, error: 'Gemini API key not provided' };
  }

  if (!content || content.length < 20) {
    return { success: false, error: 'Content too short for analysis' };
  }

  try {
    const url = `${GEMINI_API_URL}?key=${geminiApiKey}`;
    
    // Extract text from HTML tags for cleaner input
    const cleanContent = extractTextFromHTML(content);
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nContent to analyze:\n${cleanContent.slice(0, 5000)}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 512,
        },
      }),
    }, 15000);

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

    const parsed = parseGeminiResponse(data.candidates[0].content.parts[0].text);
    
    if (!parsed.name || !parsed.description) {
      return { success: false, error: 'Invalid response format from AI' };
    }

    return {
      success: true,
      data: parsed,
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

// Parse plaintext response from Gemini
function parseGeminiResponse(text: string): AirdropEnrichment {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const result: AirdropEnrichment = {
    name: '',
    symbol: '',
    description: '',
    website: undefined,
    twitter: undefined,
    discord: undefined,
    telegram: undefined,
    isOngoing: false,
    confidence: 0.5,
  };
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    
    if (!key || !value) continue;
    
    switch (key.toUpperCase()) {
      case 'NAME':
        result.name = sanitizeString(value);
        break;
      case 'SYMBOL':
        result.symbol = sanitizeString(value.toUpperCase()).slice(0, 5);
        break;
      case 'DESCRIPTION':
        result.description = sanitizeString(value).slice(0, 200);
        break;
      case 'WEBSITE':
        if (value && value.toUpperCase() !== 'NONE') {
          result.website = extractUrl(value);
        }
        break;
      case 'TWITTER':
        if (value && value.toUpperCase() !== 'NONE') {
          result.twitter = sanitizeString(value.replace('@', ''));
        }
        break;
      case 'DISCORD':
        if (value && value.toUpperCase() !== 'NONE') {
          result.discord = extractUrl(value);
        }
        break;
      case 'TELEGRAM':
        if (value && value.toUpperCase() !== 'NONE') {
          result.telegram = extractUrl(value);
        }
        break;
      case 'ONGOING':
        result.isOngoing = value.toUpperCase() === 'YES';
        break;
      case 'CONFIDENCE':
        result.confidence = Math.min(Math.max(parseFloat(value) || 0.5, 0), 1);
        break;
    }
  }
  
  return result;
}

// Extract plain text from HTML content
function extractTextFromHTML(html: string): string {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';
  
  // Extract headings
  const headings: string[] = [];
  const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
  const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
  const h3Matches = html.match(/<h3[^>]*>([^<]+)<\/h3>/gi);
  if (h1Matches) headings.push(...h1Matches.map(m => m.replace(/<[^>]+>/g, '').trim()));
  if (h2Matches) headings.push(...h2Matches.map(m => m.replace(/<[^>]+>/g, '').trim()));
  if (h3Matches) headings.push(...h3Matches.map(m => m.replace(/<[^>]+>/g, '').trim()));
  
  // Extract links
  const links: string[] = [];
  const linkMatches = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi);
  if (linkMatches) {
    links.push(...linkMatches.map(l => {
      const hrefMatch = l.match(/href=["']([^"']+)["']/i);
      const textMatch = l.match(/>([^<]+)</i);
      return `${textMatch ? textMatch[1].trim() : ''}: ${hrefMatch ? hrefMatch[1] : ''}`;
    }));
  }
  
  // Remove all HTML tags for body text
  const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  return [title, metaDesc, ...headings, ...links.slice(0, 10), bodyText.slice(0, 3000)].filter(t => t).join('\n');
}

// Extract URL from text
function extractUrl(text: string): string | undefined {
  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    const url = urlMatch[0];
    // Validate URL
    try {
      new URL(url);
      return url;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 500);
}

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
    
    // Rate limiting between AI calls
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  
  return results;
}
