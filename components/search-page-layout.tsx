"use client"
import { ReactNode, useEffect } from "react"
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
    // Trigger session creation + backend logging on page load
    initializeSession();
  }, []);

  const SearchTabsComponent = searchTabsVariant === 'no-ai-mode' ? SearchTabsNoAi : SearchTabs;

  return (
    <div className="min-h-screen bg-white text-gray-800" onContextMenu={(e) => e.preventDefault()}>
      {/* Header with search bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <HeadSection />
        <div className="px-48">
          <SearchTabsComponent />
        </div>
      </header>

      {children}
    </div>
  )
}
