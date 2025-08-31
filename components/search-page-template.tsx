"use client"
import { SearchResults } from "@/components/search-results"
import { VideosSection } from "@/components/videos-section"
import { Pagination } from "@/components/pagination"
import { SearchPageLayout } from "@/components/search-page-layout"
import { ConditionalAiOverview } from "@/components/conditional-ai-overview"
import { ConditionalDiscussions } from "@/components/conditional-discussions"
import { loadSearchData, processSearchData, getTopicFromPathname, getPageNumberFromPathname } from "@/lib/search-data"
import { usePathname } from "next/navigation"

export interface SearchPageConfig {
  topic?: string
  pageNumber?: number
  searchTabsVariant?: 'default' | 'no-ai-mode'
  aiOverviewPosition?: 'top' | 'middle' | 'none'
  showAiOverview?: boolean
  showVideos?: boolean
  showDiscussions?: boolean
  useDynamicTopic?: boolean
  useDynamicPageNumber?: boolean
}

interface SearchPageTemplateProps {
  config: SearchPageConfig
}

export function SearchPageTemplate({ config }: SearchPageTemplateProps) {
  const pathname = usePathname();
  
  // Determine topic and page number
  const topic = config.useDynamicTopic ? getTopicFromPathname(pathname) : (config.topic || 'Laptop');
  const pageNumber = config.useDynamicPageNumber ? getPageNumberFromPathname(pathname) : (config.pageNumber || 1);
  
  // Load and process data
  const searchData = loadSearchData(topic, pageNumber);
  const { beforePeopleAlsoAsk, beforeVideos, beforePeopleAlsoSearchFor, bottomResults, allResults } = processSearchData(searchData);
  
  // Default config values
  const {
    searchTabsVariant = 'default',
    aiOverviewPosition = 'none',
    showAiOverview = false,
    showVideos = true,
    showDiscussions = true
  } = config;

  // For simple pages (like page 2, 3, 4), show all results without sections
  const isSimplePage = pageNumber > 1;

  return (
    <SearchPageLayout searchTabsVariant={searchTabsVariant}>
      {/* AI Overview Section - only show at top */}
      {showAiOverview && aiOverviewPosition === 'top' && (
        <ConditionalAiOverview position="top" show={true} />
      )}
      
      <main className="container mx-auto px-15 py-4">
        <div className="max-w-2xl">
          {isSimplePage ? (
            // Simple layout for pages 2, 3, 4
            <SearchResults results={allResults} page={pageNumber} />
          ) : (
            // Complex layout for page 1
            <>
              <SearchResults results={beforePeopleAlsoAsk} page={pageNumber} />
              
              {/* AI Overview in middle position */}
              {showAiOverview && aiOverviewPosition === 'middle' && (
                <ConditionalAiOverview position="middle" show={true} />
              )}
              
              <SearchResults results={beforeVideos} page={pageNumber} />
              
              {/* Videos Section */}
              {showVideos && <VideosSection />}
              
              <SearchResults results={beforePeopleAlsoSearchFor} page={pageNumber} />
              
              {/* Discussions and Forums */}
              {showDiscussions && <ConditionalDiscussions topic={topic} />}
              
              <SearchResults results={bottomResults} page={pageNumber} />
            </>
          )}
          
          {/* Pagination */}
          <Pagination />
        </div>
      </main>
    </SearchPageLayout>
  )
}
