/**
 * Utility functions for loading and processing search data
 */

export interface SitelinkItem {
  title: string;
  link: string;
}

export interface Sitelinks {
  inline?: SitelinkItem[];
}

export interface SearchResult {
  position: number;
  title: string;
  link: string;
  redirect_link?: string;
  displayed_link: string;
  thumbnail?: string;
  favicon?: string;
  date?: string;
  snippet: string;
  snippet_highlighted_words?: string[];
  sponsored?: boolean;
  sitelinks?: Sitelinks;
}

export interface SearchDataSegments {
  beforePeopleAlsoAsk: SearchResult[];
  beforeVideos: SearchResult[];
  beforePeopleAlsoSearchFor: SearchResult[];
  bottomResults: SearchResult[];
  allResults: SearchResult[];
}

/**
 * Load search data for a specific topic and page number
 */
export function loadSearchData(
  topic: string,
  pageNumber: number,
): SearchResult[] {
  try {
    const data = require(`@/data/${topic}/${pageNumber}.json`);
    return data as SearchResult[];
  } catch (error) {
    console.error(
      `Failed to load search data for ${topic}/${pageNumber}:`,
      error,
    );
    return [];
  }
}

/**
 * Process search data into segments for different page layouts
 * Also marks the first 2 results as sponsored for consistency across all layouts
 */
export function processSearchData(
  searchData: SearchResult[],
): SearchDataSegments {
  // 标记前2个搜索结果为 sponsored（与 middle-ai-overview 中 AI Overview 前的结果数量一致）
  const SPONSORED_COUNT = 2;
  const processedData = searchData.map((result, index) => ({
    ...result,
    sponsored: index < SPONSORED_COUNT,
  }));

  return {
    beforePeopleAlsoAsk: processedData.slice(0, 1),
    beforeVideos: processedData.slice(1, 2),
    beforePeopleAlsoSearchFor: processedData.slice(2, 3),
    bottomResults: processedData.slice(3),
    allResults: processedData.slice(0),
  };
}

/**
 * Extract topic name from pathname
 */
export function getTopicFromPathname(pathname: string): string {
  return pathname.split("/").slice(1, 2).join("-");
}

/**
 * Extract page number from pathname
 */
export function getPageNumberFromPathname(pathname: string): number {
  const segments = pathname.split("/");
  const lastSegment = segments[segments.length - 1];
  const pageNumber = parseInt(lastSegment, 10);
  return isNaN(pageNumber) ? 1 : pageNumber;
}

/**
 * Check if a topic has discussions and forums data
 */
export function hasDiscussions(topic: string): boolean {
  const topicsWithDiscussions = ["Car-vehicle", "Phone", "Taylor-swift"];
  return topicsWithDiscussions.includes(topic);
}
