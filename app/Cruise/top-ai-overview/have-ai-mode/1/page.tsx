"use client"
import { SearchPageTemplate } from "@/components/search-page-template"

export default function Home() {
  return (
    <SearchPageTemplate 
      config={{
        useDynamicTopic: true,
        pageNumber: 1,
        searchTabsVariant: "default",
        aiOverviewPosition: "top",
        showAiOverview: true,
        showVideos: true,
        showDiscussions: true
      }}
    />
  )
}
