/**
 * Utility functions for loading and processing search data
 */

export interface SearchDataSegments {
  beforePeopleAlsoAsk: any[]
  beforeVideos: any[]
  beforePeopleAlsoSearchFor: any[]
  bottomResults: any[]
  allResults: any[]
}

/**
 * Load search data for a specific topic and page number
 */
export function loadSearchData(topic: string, pageNumber: number) {
  try {
    return require(`@/data/${topic}/${pageNumber}.json`);
  } catch (error) {
    console.error(`Failed to load search data for ${topic}/${pageNumber}:`, error);
    return [];
  }
}

/**
 * Process search data into segments for different page layouts
 */
export function processSearchData(searchData: any[]): SearchDataSegments {
  return {
    beforePeopleAlsoAsk: searchData.slice(0, 1),
    beforeVideos: searchData.slice(1, 2),
    beforePeopleAlsoSearchFor: searchData.slice(2, 3),
    bottomResults: searchData.slice(3),
    allResults: searchData.slice(0)
  }
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
  const topicsWithDiscussions = ['Car-vehicle', 'Phone', 'Taylor-swift'];
  return topicsWithDiscussions.includes(topic);
}
