'use client'

import React, { useState, useEffect } from "react"
import { TrackedLink } from "@/components/tracked-link"
import { usePathname, useSearchParams } from "next/navigation"

interface SearchTabsProps {
  currentPage?: string
}

export function SearchTabs({ currentPage = "all" }: SearchTabsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [ridParam, setRidParam] = useState<string | null>(null)

  // Get RID parameter on the client side to avoid hydration mismatch
  useEffect(() => {
    const rid = searchParams.get('RID')
    setRidParam(rid)
  }, [searchParams])

  const match = pathname.match(/^(.*?)(\/\d+)?\/?$/)
  const basePath = match ? match[1].split('/')[1] ? `/${match[1].split('/')[1]}` : "" : "";

  // Helper function to preserve URL parameters (especially RID)
  const preserveUrlParams = (baseUrl: string): string => {
    if (!ridParam) return baseUrl;
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}RID=${encodeURIComponent(ridParam)}`;
  };

  //  href for 'All' tab
  let allHref = "/"
  let allShouldNavigate = true // 新增：控制是否进行导航

  if (pathname.endsWith("/ai-mode")) {
    // AI Mode - 需要返回到原来的ai-overview页面（类似back按钮效果）
    const pathParts = pathname.split("/").filter(Boolean)
    if (pathParts.length >= 1) {
      const topic = pathParts[0] // 获取topic (如 Phone)
      
      // 尝试从sessionStorage获取原始的treatment group (标签页级别隔离)
      let originalPath = "/"
      try {
        // Only access sessionStorage on client side
        if (typeof window !== 'undefined') {
          const originalTreatmentGroup = sessionStorage.getItem("original_treatment_group")
          if (originalTreatmentGroup && originalTreatmentGroup.includes("_")) {
            const [mode, variant] = originalTreatmentGroup.split("_")
            originalPath = `/${topic}/${mode}/${variant}/1` // 直接返回，不使用iframe
          } else {
            // 如果没有原始路径，默认返回middle-ai-overview/have-ai-mode
            originalPath = `/${topic}/middle-ai-overview/have-ai-mode/1`
          }
        } else {
          // Server-side fallback
          originalPath = `/${topic}/middle-ai-overview/have-ai-mode/1`
        }
      } catch (error) {
        console.error("Failed to get original treatment group:", error)
        originalPath = `/${topic}/middle-ai-overview/have-ai-mode/1`
      }
      
      // Preserve RID parameter when returning from AI mode
      allHref = preserveUrlParams(originalPath)
      allShouldNavigate = true
    } else {
      allHref = preserveUrlParams("/")
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
      const aiModeUrl = `${basePath}/ai-mode?from=${encodeURIComponent(pathname)}`;
      return preserveUrlParams(aiModeUrl);
    } else if (tabKey === "all") {
      return allShouldNavigate ? allHref : "#" // 如果不应该导航，返回#
    } else {
      // 其他tabs保持当前的treatment group context
      const params = new URLSearchParams()
      params.set('maintain_task', 'true')
      
      // Preserve RID parameter for iframe navigation
      if (ridParam) {
        params.set('RID', ridParam);
      }
      
      const baseUrl = `/iframe?url=${encodeURIComponent(`https://www.google.com/search?${tabKey === 'images' ? 'tbm=isch' : tabKey === 'videos' ? 'tbm=vid' : ''}&q=example`)}`
      return `${baseUrl}&${params.toString()}`
    }
  }

  // 处理All标签的点击事件
  const handleAllClick = (e: React.MouseEvent) => {
    if (!allShouldNavigate) {
      e.preventDefault() // 阻止默认导航行为
      console.log("All tab clicked but navigation prevented (current page maintained)")
    }
  }

  // AI Mode 中的 All 按钮点击处理函数
  const handleAiModeAllClick = async (e: React.MouseEvent) => {
    e.preventDefault() // 阻止默认导航行为
    e.stopPropagation() // 阻止事件冒泡
    
    // 手动触发 dwell time 计算（模拟 back 按钮行为）
    if (typeof window !== 'undefined') {
      try {
        // 动态导入 analytics 函数
        const { trackReturnFromLink } = await import('@/lib/analytics')
        await trackReturnFromLink("ai_mode_all_button")
        
        // 延迟导航，确保 dwell time 计算完成
        setTimeout(() => {
          window.location.href = allHref
        }, 200)
      } catch (error) {
        console.error("Failed to track dwell time:", error)
        // 即使出错也要导航
        window.location.href = allHref
      }
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
        if (tab.key === "all") {
          // AI Mode 页面的 All 按钮 - 需要特殊处理 dwell time
          if (pathname.endsWith("/ai-mode")) {
            return (
              <button
                key={tab.name}
                onClick={handleAiModeAllClick}
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
          
          // 普通页面的 All 标签 - 不导航
          if (!allShouldNavigate) {
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
        }
        
        // AI Mode 按钮也需要特殊处理 - 使用直接导航而非 iframe
        if (tab.key === "ai-mode") {
          const handleAiModeClick = async (e: React.MouseEvent) => {
            e.preventDefault()
            
            try {
              // 追踪点击事件
              const { trackLinkClick } = await import('@/lib/analytics')
              await trackLinkClick("SearchTabs", index, tab.name)
              
              // 直接导航到 AI Mode，不使用 iframe
              setTimeout(() => {
                window.location.href = tab.href
              }, 100)
            } catch (error) {
              console.error("Failed to track AI Mode click:", error)
              window.location.href = tab.href
            }
          }
          
          return (
            <button
              key={tab.name}
              onClick={handleAiModeClick}
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