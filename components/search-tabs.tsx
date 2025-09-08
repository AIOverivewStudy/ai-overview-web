'use client'

import { TrackedLink } from "@/components/tracked-link"
import { usePathname } from "next/navigation"

interface SearchTabsProps {
  currentPage?: string
}

export function SearchTabs({ currentPage = "all" }: SearchTabsProps) {
  const pathname = usePathname()

  const match = pathname.match(/^(.*?)(\/\d+)?\/?$/)
  const basePath = match ? match[1].split('/')[1] ? `/${match[1].split('/')[1]}` : "" : "";

  //  href for 'All' tab
  let allHref = "/"

  if (pathname.endsWith("/ai-mode")) {
    // AI Mode - 需要返回到原来的ai-overview页面
    const pathParts = pathname.split("/").filter(Boolean)
    if (pathParts.length >= 1) {
      const topic = pathParts[0] // 获取topic (如 Phone)
      
      // 尝试从localStorage获取原始的treatment group
      let originalPath = "/"
      try {
        const originalTreatmentGroup = localStorage.getItem("original_treatment_group")
        if (originalTreatmentGroup && originalTreatmentGroup.includes("_")) {
          const [mode, variant] = originalTreatmentGroup.split("_")
          originalPath = `/iframe/${topic}/${mode}/${variant}/1`
        } else {
          // 如果没有原始路径，默认返回middle-ai-overview/have-ai-mode
          originalPath = `/iframe/${topic}/middle-ai-overview/have-ai-mode/1`
        }
      } catch (error) {
        console.error("Failed to get original treatment group:", error)
        originalPath = `/iframe/${topic}/middle-ai-overview/have-ai-mode/1`
      }
      
      allHref = originalPath
    } else {
      allHref = "/" 
    }
  } else {
    // not AI mode, turn to 1
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length >= 4) {
      parts[parts.length - 1] = "1"
      allHref = "/" + parts.join("/")
    }
  }

  // 对于tab navigation，需要确保维持同一个task context
  const generateTabHref = (tabKey: string, basePath: string, pathname: string) => {
    if (tabKey === "ai-mode") {
      return `${basePath}/ai-mode?from=${encodeURIComponent(pathname)}`
    } else if (tabKey === "all") {
      return allHref
    } else {
      // 其他tabs保持当前的treatment group context
      const searchParams = new URLSearchParams()
      searchParams.set('maintain_task', 'true')
      const baseUrl = `/iframe?url=${encodeURIComponent(`https://www.google.com/search?${tabKey === 'images' ? 'tbm=isch' : tabKey === 'videos' ? 'tbm=vid' : ''}&q=example`)}`
      return `${baseUrl}&${searchParams.toString()}`
    }
  }

  const tabs = [
    { name: "AI Mode", key: "ai-mode", href: generateTabHref("ai-mode", basePath, pathname) },
    { name: "All", key: "all", href: generateTabHref("all", basePath, pathname) },
    { name: "Images", key: "images", href: generateTabHref("images", basePath, pathname) },
    { name: "Short videos", key: "videos", href: generateTabHref("videos", basePath, pathname) },
    { name: "Forums", key: "forums", href: generateTabHref("forums", basePath, pathname) },
    { name: "More", key: "more", href: generateTabHref("more", basePath, pathname) },
  ]

  return (
    <div className="flex items-center space-x-6 overflow-x-auto scrollbar-hide">
      {tabs.map((tab, index) => (
        <TrackedLink
          key={tab.name}
          href={tab.href}
          componentName="SearchTabs"
          linkIndex={index}
          className={`py-3 px-1 text-sm border-b-2 whitespace-nowrap ${
            currentPage === tab.key
              ? "text-blue-600 border-blue-600"
              : "text-gray-600 border-transparent hover:text-gray-800"
          }`}
        >
          {tab.name}
        </TrackedLink>
      ))}
    </div>
  )
}