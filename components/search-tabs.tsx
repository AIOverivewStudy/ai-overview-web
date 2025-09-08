'use client'

import React from "react"
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
  let allShouldNavigate = true // 新增：控制是否进行导航

  if (pathname.endsWith("/ai-mode")) {
    // AI Mode - 需要返回到原来的ai-overview页面（类似back按钮效果）
    const pathParts = pathname.split("/").filter(Boolean)
    if (pathParts.length >= 1) {
      const topic = pathParts[0] // 获取topic (如 Phone)
      
      // 尝试从localStorage获取原始的treatment group
      let originalPath = "/"
      try {
        const originalTreatmentGroup = localStorage.getItem("original_treatment_group")
        if (originalTreatmentGroup && originalTreatmentGroup.includes("_")) {
          const [mode, variant] = originalTreatmentGroup.split("_")
          originalPath = `/${topic}/${mode}/${variant}/1` // 直接返回，不使用iframe
        } else {
          // 如果没有原始路径，默认返回middle-ai-overview/have-ai-mode
          originalPath = `/${topic}/middle-ai-overview/have-ai-mode/1`
        }
      } catch (error) {
        console.error("Failed to get original treatment group:", error)
        originalPath = `/${topic}/middle-ai-overview/have-ai-mode/1`
      }
      
      allHref = originalPath
      allShouldNavigate = true
    } else {
      allHref = "/" 
      allShouldNavigate = true
    }
  } else {
    // 普通搜索页面 ([mode]/[variant]/[page]) - All标签什么都不做，保持当前页面
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length >= 4) {
      // 如果是正常的搜索页面格式，All标签不进行导航
      allHref = pathname // 保持当前页面
      allShouldNavigate = false // 不进行导航
    } else {
      // 其他情况，使用默认行为
      allHref = "/"
      allShouldNavigate = true
    }
  }

  // 对于tab navigation，需要确保维持同一个task context
  const generateTabHref = (tabKey: string, basePath: string, pathname: string) => {
    if (tabKey === "ai-mode") {
      return `${basePath}/ai-mode?from=${encodeURIComponent(pathname)}`
    } else if (tabKey === "all") {
      return allShouldNavigate ? allHref : "#" // 如果不应该导航，返回#
    } else {
      // 其他tabs保持当前的treatment group context
      const searchParams = new URLSearchParams()
      searchParams.set('maintain_task', 'true')
      const baseUrl = `/iframe?url=${encodeURIComponent(`https://www.google.com/search?${tabKey === 'images' ? 'tbm=isch' : tabKey === 'videos' ? 'tbm=vid' : ''}&q=example`)}`
      return `${baseUrl}&${searchParams.toString()}`
    }
  }

  // 处理All标签的点击事件
  const handleAllClick = (e: React.MouseEvent) => {
    if (!allShouldNavigate) {
      e.preventDefault() // 阻止默认导航行为
      console.log("All tab clicked but navigation prevented (current page maintained)")
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
      {tabs.map((tab, index) => {
        // 特殊处理All标签
        if (tab.key === "all" && !allShouldNavigate) {
          return (
            <button
              key={tab.name}
              onClick={handleAllClick}
              className={`py-3 px-1 text-sm border-b-2 whitespace-nowrap ${
                currentPage === tab.key
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              {tab.name}
            </button>
          )
        }
        
        return (
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
        )
      })}
    </div>
  )
}