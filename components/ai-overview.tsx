'use client'

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { MoreVertical, ChevronDown, LinkIcon, X } from "lucide-react"
import { WebsiteFavicon } from "@/components/website-favicon"
import { getWebsiteName } from "@/lib/favicon-service"
import { usePathname } from "next/navigation"
import { trackShowMoreClick, trackShowAllClick } from "@/lib/analytics"
import { TrackedLink } from "@/components/tracked-link"

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
  const [showMore, setShowMore] = useState(false)
  const [showAllReferences, setShowAllReferences] = useState(false)
  const [filteredReferenceIndexes, setFilteredReferenceIndexes] = useState<number[] | null>(null)
  const textContentRef = useRef<HTMLDivElement>(null)
  const [textContentHeight, setTextContentHeight] = useState<number>(0)
  const data = aiOverviewData as AIOverviewData
  

  useEffect(() => {
    if (textContentRef.current) {
      setTextContentHeight(textContentRef.current.offsetHeight)
    }
  }, [showMore])

  const handleReferenceClick = (referenceIndexes?: number[]) => {
    if (filteredReferenceIndexes && JSON.stringify(filteredReferenceIndexes) === JSON.stringify(referenceIndexes)) {
      setFilteredReferenceIndexes(null)
    } else if (referenceIndexes) {
      setFilteredReferenceIndexes(referenceIndexes)
      setShowAllReferences(false)
    }
  }

  const getDisplayedReferences = () => {
    if (filteredReferenceIndexes) {
      return data.references.filter((ref) => filteredReferenceIndexes.includes(ref.index))
    }
    return data.references
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
    // Track the "Show more" button click
    trackShowMoreClick("AiOverview")
  }

  const renderReferenceLink = (referenceIndexes?: number[]) => {
    if (!referenceIndexes) return null

    return (
      <button
        onClick={() => handleReferenceClick(referenceIndexes)}
        className="inline-flex items-center text-gray-500 ml-1 hover:text-gray-700"
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
    <div className="w-full bg-white border-b border-gray-200 mb-8">
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
                {renderReferenceLink(data.text_blocks[0].reference_indexes)}
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
                      {renderReferenceLink(data.text_blocks[1].list[0].reference_indexes)}
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
                        {renderReferenceLink(item.reference_indexes)}
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
                                {renderReferenceLink(subItem.reference_indexes)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {!showMore ? (
              <button
                onClick={handleShowMore}
                className="flex items-center justify-center w-full bg-gray-100 text-gray-800 py-3 rounded-full hover:bg-gray-200 mt-4 border border-gray-300"
              >
                <span>Show more</span>
                <ChevronDown className="h-5 w-5 ml-1" />
              </button>
            ) : (
              <div className="border-t border-gray-200 mt-8 pt-6">
                <button className="flex items-center justify-center w-full max-w-md mx-auto bg-blue-50 text-blue-700 py-3 rounded-full hover:bg-blue-100 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                    <path d="M16 16h5v5"></path>
                  </svg>
                  <span>Dive deeper in AI Mode</span>
                </button>

                <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                  <span>AI responses may include mistakes.</span>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <button className="flex items-center text-gray-600 hover:text-gray-800 px-4 py-2 rounded-full border border-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
                      <path d="M7 7h.01"></path>
                    </svg>
                    Export
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-gray-800 px-4 py-2 rounded-full border border-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-gray-800 p-2 rounded-full border border-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
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
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-gray-800 p-2 rounded-full border border-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-gray-800 p-2 rounded-full border border-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* References Panel - Fixed width with proper scrollable container */}
          <div className="w-80 relative flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-4">
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
                        trackShowAllClick("AiOverview");
                      }}
                      className="flex items-center justify-center w-full bg-blue-100 text-blue-700 py-3 rounded-full hover:bg-blue-200"
                    >
                      <span>Show all</span>
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

                  {/* Optional "Show all references" when filtered */}
                  {filteredReferenceIndexes && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-50 pt-2">
                      <button
                        onClick={() => setFilteredReferenceIndexes(null)}
                        className="flex items-center justify-center w-full bg-blue-100 text-blue-700 py-3 rounded-full hover:bg-blue-200"
                      >
                        <span>Show all references</span>
                      </button>
                    </div>
                  )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
