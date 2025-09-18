"use client"
import { ReactNode, useEffect, Suspense } from "react"
import HeadSection from "@/components/head-section"
import { SearchTabs } from "@/components/search-tabs"
import { SearchTabs as SearchTabsNoAi } from "@/components/search-tabs-no-ai-mode"
import { initializeSession } from "@/lib/analytics"

interface SearchPageLayoutProps {
  children: ReactNode
  searchTabsVariant?: 'default' | 'no-ai-mode'
}

export function SearchPageLayout({ 
  children, 
  searchTabsVariant = 'default' 
}: SearchPageLayoutProps) {
  useEffect(() => {
    // Ensure session initialization for pages using SearchPageLayout
    // This provides redundancy with AnalyticsTracker for reliability
    initializeSession();
  }, []);

  const SearchTabsComponent = searchTabsVariant === 'no-ai-mode' ? SearchTabsNoAi : SearchTabs;

  return (
    <div className="min-h-screen bg-white text-gray-800" onContextMenu={(e) => e.preventDefault()}>
      {/* Header with search bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <HeadSection />
        <div className="px-48">
          <Suspense fallback={<div className="flex items-center space-x-6 overflow-x-auto scrollbar-hide h-12" />}>
            <SearchTabsComponent />
          </Suspense>
        </div>
      </header>

      {children}
    </div>
  )
}
