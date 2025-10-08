'use client'

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { MoreVertical, ChevronDown, LinkIcon, X } from "lucide-react"
import { WebsiteFavicon } from "@/components/website-favicon"
import { getWebsiteName } from "@/lib/favicon-service"
import { usePathname } from "next/navigation"
import { trackShowAllContentClick, trackShowAllReferencesClick, trackFilterReferencesClick } from "@/lib/analytics"
import { TrackedLink } from "@/components/tracked-link"
import { usePostHog } from "posthog-js/react"

interface TextBlock {
  type: string
  snippet?: string
  title?: string
  snippet_highlighted_words?: string[]
  reference_indexes?: number[]   
  list?: Array<{
    title: string
    snippets?: {
      [key: string]: string
    }
    snippet?: {
      [key: string]: string
    }
    reference_indexes?: number[]
    type?: string
    list?: Array<{
      snippet: {
        [key: string]: string
      }
      reference_indexes?: number[]
    }>
  }>
}

interface Reference {
  title: string
  link: string
  snippet: string
  source: string
  index: number
  host?: string 
}

interface AIOverviewData {
  text_blocks: TextBlock[]
  references: Reference[]
}

export function AiOverview() {
  const pathname = usePathname();
  const pageName = pathname.split("/").slice(1, 2).join("-");
  const aiOverviewData = require(`@/data/${pageName}/ai-overview.json`);
  const posthog = usePostHog();
  
  // 生成当前页面的唯一标识符（用于sessionStorage key）
  const pageKey = `ai_overview_${pathname.replace(/\//g, '_')}`
  
  // 初始状态始终为false，避免水合错误
  const [showMore, setShowMore] = useState(false)
  const [showAllReferences, setShowAllReferences] = useState(false)
  const [filteredReferenceIndexes, setFilteredReferenceIndexes] = useState<number[] | null>(null)
  const [showFilteredReferencesOverlay, setShowFilteredReferencesOverlay] = useState(false)
  const textContentRef = useRef<HTMLDivElement>(null)
  const [textContentHeight, setTextContentHeight] = useState<number>(0)
  const aiOverviewRef = useRef<HTMLDivElement>(null)
  const data = aiOverviewData as AIOverviewData
  
  // 计算所有引用链接的全局索引映射
  const getReferenceIndexMap = () => {
    const indexMap = new Map<string, number>()
    let globalIndex = 1
    
    // 遍历所有text_blocks，按出现顺序分配索引
    data.text_blocks.forEach((block) => {
      if (block.reference_indexes) {
        const key = block.reference_indexes.sort().join(',')
        if (!indexMap.has(key)) {
          indexMap.set(key, globalIndex++)
        }
      }
      
      // 处理列表项
      if (block.list) {
        block.list.forEach((item) => {
          if (item.reference_indexes) {
            const key = item.reference_indexes.sort().join(',')
            if (!indexMap.has(key)) {
              indexMap.set(key, globalIndex++)
            }
          }
          
          // 处理嵌套列表
          if (item.list) {
            item.list.forEach((subItem) => {
              if (subItem.reference_indexes) {
                const key = subItem.reference_indexes.sort().join(',')
                if (!indexMap.has(key)) {
                  indexMap.set(key, globalIndex++)
                }
              }
            })
          }
        })
      }
    })
    
    return indexMap
  }
  
  const referenceIndexMap = getReferenceIndexMap()

  useEffect(() => {
    if (textContentRef.current) {
      setTextContentHeight(textContentRef.current.offsetHeight)
    }
  }, [showMore])

  // 在客户端挂载后恢复sessionStorage中的状态 (标签页级别隔离)
  useEffect(() => {
    const savedShowMore = sessionStorage.getItem(`${pageKey}_showMore`) === 'true'
    const savedShowAllReferences = sessionStorage.getItem(`${pageKey}_showAllReferences`) === 'true'
    
    if (savedShowMore) {
      setShowMore(true)
    }
    if (savedShowAllReferences) {
      setShowAllReferences(true)
    }
  }, [pageKey])

  // 🚀 AI Overview 智能追踪 (使用 Intersection Observer)
  useEffect(() => {
    if (!posthog || !aiOverviewRef.current) return;

    let lastReportedProgress = -1;
    const startTime = Date.now();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const visibilityPercentage = Math.round(entry.intersectionRatio * 100);
        
        if (entry.isIntersecting !== (lastReportedProgress > 0)) {
          posthog.capture('$ai_overview_reading', {
            visibility_percentage: visibilityPercentage,
            time_on_element: Date.now() - startTime,
            is_fully_visible: entry.intersectionRatio === 1,
            page_url: window.location.href,
            viewport_info: {
              bounding_rect_top: entry.boundingClientRect.top,
              bounding_rect_bottom: entry.boundingClientRect.bottom,
              bounding_rect_height: entry.boundingClientRect.height,
              intersection_rect_height: entry.intersectionRect.height
            }
          });

          
          // 调试日志
          console.log(`📖 AI Overview 阅读进度: ${visibilityPercentage}%`, {
            '当前可见': visibilityPercentage + '%',
            '完全可见': entry.intersectionRatio === 1,
            '部分可见': entry.isIntersecting && entry.intersectionRatio < 1,
            '完全隐藏': !entry.isIntersecting,
            '阅读时长': Math.round((Date.now() - startTime) / 1000) + '秒',
            '元素位置': {
              '顶部': Math.round(entry.boundingClientRect.top) + 'px',
              '底部': Math.round(entry.boundingClientRect.bottom) + 'px',
              '高度': Math.round(entry.boundingClientRect.height) + 'px',
              '可见高度': Math.round(entry.intersectionRect.height) + 'px'
            }
          });
        }
      });
    }, {
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    });

    observer.observe(aiOverviewRef.current);

    return () => {
      observer.disconnect();
    };
  }, [posthog, aiOverviewRef])

  const handleReferenceClick = (referenceIndexes?: number[], globalReferenceIndex?: number, textBlockContent?: string) => {
    if (referenceIndexes) {
      // Track the filter references click with detailed context
      trackFilterReferencesClick(referenceIndexes, "AiOverview", globalReferenceIndex, textBlockContent);
      
      // Show overlay with filtered references instead of modifying the main list
      setFilteredReferenceIndexes(referenceIndexes)
      setShowFilteredReferencesOverlay(true)
    }
  }

  const getDisplayedReferences = () => {
    // Always return all references for the main list
    return data.references
  }

  const getFilteredReferences = () => {
    if (filteredReferenceIndexes) {
      return data.references.filter((ref) => filteredReferenceIndexes.includes(ref.index))
    }
    return []
  }

  const renderHighlightedText = (text: string, highlightedWords: string[] = []) => {
    if (!highlightedWords.length) return text

    const regex = new RegExp(`(${highlightedWords.join("|")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (highlightedWords.some((word) => word.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const handleShowMore = () => {
    setShowMore(true)
    // 保存状态到sessionStorage (标签页级别隔离)
    sessionStorage.setItem(`${pageKey}_showMore`, 'true')
    // Track the "Show more" button click
    trackShowAllContentClick("AiOverview")
  }

  const renderReferenceLink = (referenceIndexes?: number[], textBlockContent?: string) => {
    if (!referenceIndexes) return null

    // 根据reference_indexes获取对应的全局索引
    const key = referenceIndexes.sort().join(',')
    const globalIndex = referenceIndexMap.get(key) || 1

    return (
      <button
        onClick={() => handleReferenceClick(referenceIndexes, globalIndex, textBlockContent)}
        className="inline-flex items-center text-gray-500 ml-1 hover:text-gray-700"
        title={`Reference ${globalIndex}`}
      >
        <LinkIcon className="h-4 w-4" />
      </button>
    )
  }

  const getImageForReference = (referenceIndex: number) => {
    return `/${pageName}/images/${referenceIndex + 1}.jpeg`
  }


  const displayedReferences = getDisplayedReferences()

  return (
    <div ref={aiOverviewRef} className="w-full bg-white border-b border-gray-200 mb-8">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4285F4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M10 2v8a2 2 0 0 1-2 2H2"></path>
              <path d="M4.73 15.54A6.97 6.97 0 0 1 2 10a7 7 0 0 1 7-7"></path>
              <path d="M14.59 11.17A6.97 6.97 0 0 0 17.3 15.54"></path>
              <path d="M22 10a7 7 0 0 0-7-7"></path>
              <path d="M2 10v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8"></path>
              <path d="M6 20v-4"></path>
              <path d="M18 20v-4"></path>
              <path d="M14 8v4"></path>
              <path d="M10 8v4"></path>
            </svg>
            <span className="text-[#4285F4] font-medium">Search Labs | AI Overview</span>
          </div>
          <div className="flex items-center">
            <button className="text-gray-600 hover:text-gray-800 mr-2">Learn more</button>
            <button className="text-gray-600 hover:text-gray-800">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Text Content - Same width as main content */}
          <div className="max-w-3xl flex-1" ref={textContentRef}>
            {/* Always show first paragraph */}
            {data.text_blocks[0] && (
              <p className="text-gray-800 mb-4">
                {renderHighlightedText(
                  data.text_blocks[0].snippet || "",
                  data.text_blocks[0].snippet_highlighted_words,
                )}
                {renderReferenceLink(data.text_blocks[0].reference_indexes, data.text_blocks[0].snippet)}
              </p>
            )}


            {/* Show bullet points */}
            {data.text_blocks[1]?.list && (
              <div className="mb-4">
                {/* Always show first item */}
                {data.text_blocks[1].list[0] && (
                  <div className="mb-3">
                    <div className="font-bold text-gray-800 text-base mb-2">
                      {data.text_blocks[1].list[0].title}
                      {renderReferenceLink(data.text_blocks[1].list[0].reference_indexes, data.text_blocks[1].list[0].title)}
                    </div>
                    {data.text_blocks[1].list[0].snippets && (
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        {Object.entries(data.text_blocks[1].list[0].snippets).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-bold text-sm">{key}:</span>
                            <span className="ml-1 text-sm">{value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Show second item in gray when collapsed */}
                {!showMore && data.text_blocks[1].list[1] && (
                  <div className="mb-3 text-gray-400">
                    <div className="font-bold text-base mb-2">{data.text_blocks[1].list[1].title}</div>
                    {data.text_blocks[1].list[1].snippets && (
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        {Object.entries(data.text_blocks[1].list[1].snippets).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-bold text-sm">{key}:</span>
                            <span className="ml-1 text-sm">{value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Show all items when expanded */}
                {showMore &&
                  data.text_blocks[1].list.slice(1).map((item, index) => (
                    <div key={index + 1} className="mb-3">
                      <div className="font-bold text-gray-800 text-base mb-2">
                        {item.title}
                        {renderReferenceLink(item.reference_indexes, item.title)}
                      </div>
                      {item.snippets && (
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          {Object.entries(item.snippets).map(([key, value]) => (
                            <li key={key}>
                              <span className="font-bold text-sm">{key}:</span>
                              <span className="ml-1 text-sm">{value}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Handle nested lists */}
                      {item.type === "list" && item.list && (
                        <div className="ml-4 mt-2">
                          <ul className="list-disc list-inside space-y-1">
                            {item.list.map((subItem, subIndex) => (
                              <li key={subIndex}>
                                {Object.entries(subItem.snippet).map(([key, value]) => (
                                  <span key={key}>
                                    <span className="font-bold text-sm">{key}:</span>
                                    <span className="ml-1 text-sm">{value}</span>
                                  </span>
                                ))}
                                {renderReferenceLink(subItem.reference_indexes, item.title)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {!showMore && (
              <button
                onClick={handleShowMore}
                className="flex items-center justify-center w-full bg-gray-100 text-gray-800 py-3 rounded-full hover:bg-gray-200 mt-4 border border-gray-300"
              >
                <span>Show more</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </button>
            )}
          </div>

          {/* References Panel - Fixed width with proper scrollable container */}
          <div className="w-80 relative flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-4 relative">
              {!showMore ? (
                /* Before "Show more" - Simple container with 3 cards */
                <div className="relative">
                  {/* Reference cards container */}
                  <div
                    className={`space-y-4 overflow-hidden relative`}
                    style={{
                      maxHeight: "300px",
                    }}
                  >
                    {displayedReferences.slice(0, 3).map((ref, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                        <div className="flex">
                          <div className="flex-1 p-2">
                            <h3 className="text-blue-700 hover:underline text-lg font-medium">
                              <TrackedLink
                                href={ref.link}
                                componentName="AiOverview-References"
                                linkIndex={index}
                              >{ref.title}</TrackedLink>
                            </h3>
                            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{ref.snippet}</p>
                            <div className="flex items-center mt-1">
                              <WebsiteFavicon
                                  url={ref.host ? `https://${ref.host}` : ref.link}
                                  size={16}
                                  fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {getWebsiteName(ref.host ? `https://${ref.host}` : ref.link)}
                              </span>
                              <button className="ml-auto">
                                <MoreVertical className="h-5 w-5 text-gray-500" />
                              </button>
                            </div>
                          </div>
                          <div className="w-24 h-16">
                            <Image
                              src={getImageForReference(ref.index)}
                              alt="Article thumbnail"
                              width={96}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Gray shadow effect */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-100 to-transparent pointer-events-none"
                  ></div>
                </div>
              ) : showMore && !showAllReferences ? (
                // Show exactly 5 references, not scrollable
                <div className="space-y-4">
                  {displayedReferences.slice(0, 5).map((ref, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm"
                    >
                      <div className="flex">
                        <div className="flex-1 p-2">
                          <h3 className="text-blue-700 hover:underline text-base font-medium">
                            <TrackedLink
                              href={ref.link}
                              componentName="AiOverview-References"
                              linkIndex={index}
                            >
                              {ref.title}
                            </TrackedLink>
                          </h3>
                          <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                            {ref.snippet}
                          </p>
                          <div className="flex items-center mt-1">
                            <WebsiteFavicon
                              url={ref.host ? `https://${ref.host}` : ref.link}
                              size={16}
                              fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                            />
                            <span className="ml-2 text-xs text-gray-600">
                              {getWebsiteName(ref.host ? `https://${ref.host}` : ref.link)}
                            </span>
                            <button className="ml-auto">
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div className="w-24 h-16">
                          <Image
                            src={getImageForReference(ref.index)}
                            alt="Article thumbnail"
                            width={96}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* "Show all" button */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowAllReferences(true); 
                        // 保存状态到sessionStorage (标签页级别隔离)
                        sessionStorage.setItem(`${pageKey}_showAllReferences`, 'true')
                        trackShowAllReferencesClick("AiOverview");
                      }}
                      className="flex items-center justify-center w-full bg-blue-100 text-blue-700 py-3 rounded-full hover:bg-blue-200"
                    >
                      <span>Show all references</span>
                    </button>
                  </div>
                </div>
              ) : showMore && showAllReferences ? (
                // Scrollable all references (current implementation)
                <div
                  className="relative"
                  style={{
                    height: `${textContentHeight - 32}px`,
                    minHeight: "400px",
                  }}
                >
                  <button
                    onClick={() => setShowAllReferences(false)}
                    className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-gray-100 bg-white shadow-sm"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>

                  <div className="h-full overflow-y-auto pr-2">
                    <div className="space-y-4">
                      {displayedReferences.map((ref, index) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm"
                        >
                          <div className="flex">
                            <div className="flex-1 p-2">
                              <h3 className="text-blue-700 hover:underline text-base font-medium">
                                <TrackedLink
                                  href={ref.link}
                                  componentName="AiOverview-References"
                                  linkIndex={index}
                                >
                                  {ref.title}
                                </TrackedLink>
                              </h3>
                              <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                                {ref.snippet}
                              </p>
                              <div className="flex items-center mt-1">
                                <WebsiteFavicon
                                  url={ref.host ? `https://${ref.host}` : ref.link}
                                  size={16}
                                  fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                                />
                                <span className="ml-2 text-xs text-gray-600">
                                  {getWebsiteName(ref.host ? `https://${ref.host}` : ref.link)}
                                </span>
                                <button className="ml-auto">
                                  <MoreVertical className="h-4 w-4 text-gray-500" />
                                </button>
                              </div>
                            </div>
                            <div className="w-24 h-16">
                              <Image
                                src={getImageForReference(ref.index)}
                                alt="Article thumbnail"
                                width={96}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="h-16"></div>
                    </div>
                  </div>

                </div>
              ) : (
                // Initial 3 references (your existing block)
                <div className="relative">
                  <div
                    className={`space-y-4 overflow-hidden relative`}
                    style={{
                      maxHeight: "300px",
                    }}
                  >
                    {displayedReferences.slice(0, 3).map((ref, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm"
                      >
                        <div className="flex">
                          <div className="flex-1 p-2">
                            <h3 className="text-blue-700 hover:underline text-lg font-medium">
                              <TrackedLink
                                href={ref.link}
                                componentName="AiOverview-References"
                                linkIndex={index}
                              >
                                {ref.title}
                              </TrackedLink>
                            </h3>
                            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                              {ref.snippet}
                            </p>
                            <div className="flex items-center mt-1">
                              <WebsiteFavicon
                                url={ref.host ? `https://${ref.host}` : ref.link}
                                size={16}
                                fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {getWebsiteName(ref.host ? `https://${ref.host}` : ref.link)}
                              </span>
                              <button className="ml-auto">
                                <MoreVertical className="h-5 w-5 text-gray-500" />
                              </button>
                            </div>
                          </div>
                          <div className="w-24 h-16">
                            <Image
                              src={getImageForReference(ref.index)}
                              alt="Article thumbnail"
                              width={96}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-100 to-transparent pointer-events-none"></div>
                </div>
              )}

              {/* Filtered References Overlay */}
              {showFilteredReferencesOverlay && filteredReferenceIndexes && (
                <div className="absolute inset-0 bg-white z-10 rounded-lg">
                  <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        Related References ({getFilteredReferences().length})
                      </h3>
                      <button
                        onClick={() => {
                          setShowFilteredReferencesOverlay(false)
                          setFilteredReferenceIndexes(null)
                        }}
                        className="p-2 rounded-full hover:bg-gray-100"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Scrollable filtered references */}
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-4">
                        {getFilteredReferences().map((ref, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden shadow-sm"
                          >
                            <div className="flex">
                              <div className="flex-1 p-3">
                                <h3 className="text-blue-700 hover:underline text-base font-medium">
                                  <TrackedLink
                                    href={ref.link}
                                    componentName="AiOverview-References"
                                    linkIndex={ref.index}
                                  >
                                    {ref.title}
                                  </TrackedLink>
                                </h3>
                                <p className="text-xs text-gray-700 mt-2 line-clamp-3">
                                  {ref.snippet}
                                </p>
                                <div className="flex items-center mt-2">
                                  <WebsiteFavicon
                                    url={ref.host ? `https://${ref.host}` : ref.link}
                                    size={16}
                                    fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                                  />
                                  <span className="ml-2 text-xs text-gray-600">
                                    {getWebsiteName(ref.host ? `https://${ref.host}` : ref.link)}
                                  </span>
                                  <button className="ml-auto">
                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                  </button>
                                </div>
                              </div>
                              <div className="w-20 h-14 flex-shrink-0">
                                <Image
                                  src={getImageForReference(ref.index)}
                                  alt="Article thumbnail"
                                  width={80}
                                  height={56}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
