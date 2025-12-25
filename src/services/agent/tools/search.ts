// Web Search Tool - Using DuckDuckGo Instant Answer API

import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export class WebSearchTool extends BaseTool {
  name = 'web_search';
  description = 'Search the web for information. Returns relevant search results with titles, URLs, and snippets.';

  schema: ToolSchema = {
    name: 'web_search',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['query'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<SearchResponse>> {
    this.validateArgs(args);

    const query = args.query as string;
    const maxResults = (args.maxResults as number) ?? 5;

    context?.onProgress?.(`Searching for: ${query}`);

    try {
      // Use DuckDuckGo HTML search (more reliable than API)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI Desktop Pet/1.0)',
        },
        signal: context?.signal,
      });

      if (!response.ok) {
        return createErrorResult(`Search failed: ${response.statusText}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html, maxResults);

      return createSuccessResult({
        results,
        query,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return createErrorResult('Search cancelled');
      }
      return createErrorResult(
        error instanceof Error ? error.message : 'Search failed'
      );
    }
  }

  private parseSearchResults(html: string, maxResults: number): SearchResult[] {
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
          url: this.decodeUrl(urlMatch[1] ?? ''),
          title: this.decodeHtml(urlMatch[2] ?? ''),
          snippet: snippetMatch ? this.decodeHtml(snippetMatch[1] ?? '') : '',
        });
      }
    }

    return results;
  }

  private decodeUrl(url: string): string {
    // DuckDuckGo wraps URLs, extract the actual URL
    const match = url.match(/uddg=([^&]*)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    return url;
  }

  private decodeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
