// Web Search Tool - Using DuckDuckGo Instant Answer API
// Refactored using defineTool to eliminate boilerplate

import { defineTool } from '../define-tool';
import type { ToolExecutionContext } from '../base-tool';

// Type definitions for tool results
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
}

/**
 * Helper function to parse search results from HTML
 */
function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Simple regex parsing for DuckDuckGo HTML results
  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;

  const urlMatches = [...html.matchAll(resultRegex)];
  const snippetMatches = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(urlMatches.length, maxResults); i++) {
    const urlMatch = urlMatches[i];
    const snippetMatch = snippetMatches[i];

    if (urlMatch) {
      results.push({
        url: decodeUrl(urlMatch[1] ?? ''),
        title: decodeHtml(urlMatch[2] ?? ''),
        snippet: snippetMatch ? decodeHtml(snippetMatch[1] ?? '') : '',
      });
    }
  }

  return results;
}

/**
 * Helper function to decode URL from DuckDuckGo format
 */
function decodeUrl(url: string): string {
  // DuckDuckGo wraps URLs, extract the actual URL
  const match = url.match(/uddg=([^&]*)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }
  return url;
}

/**
 * Helper function to decode HTML entities
 */
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Search the web for information using DuckDuckGo
 */
export const webSearchTool = defineTool<
  { query: string; maxResults?: number },
  SearchResponse
>({
  name: 'web_search',
  description: 'Search the web for information. Returns relevant search results with titles, URLs, and snippets.',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query to look up on the web',
      required: true,
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results to return (default: 5)',
      required: false,
    },
  },

  async execute({ query, maxResults = 5 }, context) {
    context.onProgress?.(`Searching for: ${query}`);

    // Use DuckDuckGo HTML search (more reliable than API)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI Desktop Pet/1.0)',
      },
      signal: context.signal,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const html = await response.text();
    const results = parseSearchResults(html, maxResults);

    return {
      results,
      query,
    };
  },
});

// Legacy class export for backward compatibility (deprecated)
export class WebSearchTool {
  private static _instance = webSearchTool;

  get name() {
    return WebSearchTool._instance.name;
  }
  get description() {
    return WebSearchTool._instance.description;
  }
  get schema() {
    return WebSearchTool._instance.schema;
  }
  get requiresConfirmation() {
    return WebSearchTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return WebSearchTool._instance.execute(args, context);
  }

  toJSON() {
    return WebSearchTool._instance.toJSON();
  }
}
