"use client"
import { SearchResults } from "@/components/search-results"
import { Pagination } from "@/components/pagination"
import { SearchTabs } from "@/components/search-tabs-no-ai-mode"

import HeadSection from "@/components/head-section"
import { usePathname } from "next/navigation"

import { useEffect } from "react"
import { initializeSession } from "@/lib/analytics";

export default function Home() {
  const pathname = usePathname();
  const pageName = pathname.split("/").slice(1, 2).join("-");
  const searchData = require(`@/data/${pageName}/4.json`);
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

      <main className="container mx-auto px-15 py-4">
        <div className="max-w-2xl">

          <SearchResults results={searchData.slice(0)} page={4}/>

          <Pagination />
        </div>
      </main>
    </div>
  )
}
