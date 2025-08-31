"use client"
import { SearchResults } from "@/components/search-results"
import { AiOverview } from "@/components/ai-overview"
import { VideosSection } from "@/components/videos-section"
import { Pagination } from "@/components/pagination"
import { SearchTabs } from "@/components/search-tabs-no-ai-mode"

import searchData from "@/data/Laptop/1.json"
import HeadSection from "@/components/head-section"

import { useEffect } from "react"
import { initializeSession } from "@/lib/analytics"

export default function Home() {
  const beforePeopleAlsoAsk = searchData.slice(0, 1)
  const beforeVideos = searchData.slice(1, 2)
  const beforePeopleAlsoSearchFor = searchData.slice(2, 3)
  const bottomResults = searchData.slice(3)

    useEffect(() => {
    // Trigger session creation + backend logging on page load
    initializeSession();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800"  onContextMenu={(e) => e.preventDefault()}>
      {/* Header with search bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <HeadSection></HeadSection>
        <div className="px-48">
          <SearchTabs />
        </div>
      </header>

      {/* AI Overview Section */}
      <div className="px-42">
        <AiOverview />
      </div>
      <main className="container mx-auto px-15 py-4">
        <div className="max-w-2xl">

          <SearchResults results={beforePeopleAlsoAsk} page={1}/>

          <SearchResults results={beforeVideos} page={1}/>

          {/* Videos Section */}
          <VideosSection />

          <SearchResults results={beforePeopleAlsoSearchFor} page={1}/>

          <SearchResults results={bottomResults} page={1}/>

          {/* Pagination */}
          <Pagination />
        </div>
      </main>
    </div>
  )
}
