"use client"
import Image from "next/image"
import { SearchTabs } from "@/components/search-tabs"
import { useState } from "react"
import Link from "next/link"
import { Mic, MoreVertical, Clock, Edit, X, LinkIcon } from "lucide-react"
import aiOverviewData from "@/data/Taylor-swift/ai-mode.json"
import { TrackedLink } from "@/components/tracked-link"
import { WebsiteFavicon } from "@/components/website-favicon"
import { getWebsiteName } from "@/lib/favicon-service"

import { trackShowAllClick } from "@/lib/analytics"

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
    snippet?: string[]
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


export default function AiModePage() {
  const [textContentHeight, setTextContentHeight] = useState<number>(0)
  const data = aiOverviewData as AIOverviewData
  const [showAllReferences, setShowAllReferences] = useState(false)
  const [filteredReferenceIndexes, setFilteredReferenceIndexes] = useState<number[] | null>(null)
  const displayedReferences = (() => {
    if (filteredReferenceIndexes) {
      return data.references.filter((ref) => filteredReferenceIndexes.includes(ref.index))
    }
    if (!showAllReferences) {
      return data.references.slice(0, 3)
    }
    return data.references
  })()
  const getImageForReference = (referenceIndex: number) => {
    return `/Taylor-swift/ai-mode-images/${referenceIndex}.jpeg`
  }

  const renderHighlightedText = (text: string, highlightedWords: string[] = []) => {
    if (!highlightedWords.length) return text

    const regex = new RegExp(`(${highlightedWords.join("|")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (highlightedWords.some((word) => word.toLowerCase() === part.toLowerCase())) {
        return (
          <span key={index} className="font-semibold text-blue-700">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const handleReferenceClick = (referenceIndexes?: number[]) => {
    if (filteredReferenceIndexes && JSON.stringify(filteredReferenceIndexes) === JSON.stringify(referenceIndexes)) {
      setFilteredReferenceIndexes(null)
    } else if (referenceIndexes) {
      setFilteredReferenceIndexes(referenceIndexes)
      setShowAllReferences(false)
    }
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
  const renderTextBlock = (block: TextBlock, index: number) => {
    switch (block.type) {
      case "paragraph":
        if (block.title) {
          return (
            <div className="mb-6">
              <h2 key={index} className="text-xl font-medium text-gray-900 mb-4">
                {block.title}

              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {block.snippet}
                {renderReferenceLink(block.reference_indexes)}
              </p>
            </div>

          )
        }
        if (block.snippet) {
          return (
            <p key={index} className="text-gray-700 mb-6 text-base leading-relaxed">
              {renderHighlightedText(block.snippet, block.snippet_highlighted_words)}
              {renderReferenceLink(block.reference_indexes)}
            </p>
          )
        }
        break

      case "list":
        if (block.list) {
          // inside renderTextBlock -> case "list":
          return (
            <div key={index} className="mb-8">
              {block.list.map((item, itemIndex) => {
                if (item.type === "list" && item.list) {
                  return (
                    <div key={itemIndex} className="mb-6">
                      {/* move link inline with title */}
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {item.title}
                        {renderReferenceLink(item.reference_indexes)}
                      </h3>

                      <ul className="space-y-3 ml-4">
                        {item.list.map((subItem, subIndex) => (
                          <li key={subIndex} className="flex">
                            <span className="w-2 h-2 bg-gray-900 rounded-full mt-2 mr-4 flex-shrink-0" />
                            <div>
                              {Object.entries(subItem.snippet).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-semibold">{key}:</span>
                                  <span className="ml-1">{value}</span>
                                </div>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {/* removed extra renderReferenceLink(...) here */}
                    </div>
                  )
                }

                // regular list item: put link next to title too
                return (
                  <div key={itemIndex} className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {item.title}
                    </h3>

                    {item.snippets && (
                      <ul className="space-y-3 ml-4">
                        {Object.entries(item.snippets).map(([key, value], idx, arr) => (
                          <li key={key} className="flex">
                            <span className="w-2 h-2 bg-gray-900 rounded-full mt-2 mr-4 flex-shrink-0" />
                            <div>
                              <span className="font-semibold">{key}:</span>
                              <span className="ml-1">
                                {value}
                                {idx === arr.length - 1 && (
                                  <> {renderReferenceLink(item.reference_indexes)}</>
                                )}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {Array.isArray(item.snippet) && (
                      <ul className="space-y-3 ml-4">
                        {item.snippet.map((line: string, idx: number, arr) => (
                          <li key={idx} className="flex">
                            <span className="w-2 h-2 bg-gray-900 rounded-full mt-2 mr-4 flex-shrink-0" />
                            <span>
                              {line}
                              {idx === arr.length - 1 && renderReferenceLink(item.reference_indexes)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }
        break

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800"  onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="flex items-center px-6 py-4">
          <Link href="/" className="mr-8">
            <Image src="/google-logo.png" alt="Google" width={92} height={30} className="h-8 w-auto" />
          </Link>
          <div className="flex-1 max-w-2xl">{/* Search tabs only, no search bar on AI Mode page */}</div>
          <div className="ml-auto flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600"
              >
                <rect width="3" height="3" x="9" y="9"></rect>
                <rect width="3" height="3" x="9" y="15"></rect>
                <rect width="3" height="3" x="15" y="9"></rect>
                <rect width="3" height="3" x="15" y="15"></rect>
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
              W
            </div>
          </div>
        </div>
        <div className="px-6">
          <SearchTabs currentPage="ai-mode" />
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-16 flex-shrink-0 border-r border-gray-200">
          <div className="flex flex-col items-center py-4 space-y-4">
            <button className="p-3 rounded-full hover:bg-gray-100">
              <Clock className="h-6 w-6 text-gray-600" />
            </button>
            <button className="p-3 rounded-full hover:bg-gray-100">
              <Edit className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Content Area */}
          <div className="flex-1 flex flex-col max-w-4xl px-8 py-8 overflow-hidden">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
              <h1 className="text-3xl font-normal text-gray-900 mb-6">
                Introduce Taylor Swift
              </h1>
              <div className="prose prose-lg max-w-none">
                {data.text_blocks.map((block, index) => renderTextBlock(block, index))}
              </div>
            </div>
            <div className="pt-4 bg-white sticky bottom-0">
              <div className="relative max-w-2xl">
                <input
                  type="text"
                  placeholder="Ask anything"
                  className="w-full px-6 py-4 text-lg border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:shadow-lg pr-16 bg-gray-50"
                />
                <button className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full">
                  <Mic className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 flex flex-col px-6 py-8">
            {/* Sites indicator */}
            <div className="flex items-center mb-6">
              <div className="flex -space-x-1 mr-3">
                {data.references.slice(0, 3).map((ref, index) => (
                  <WebsiteFavicon
                    key={index}
                    url={ref.host ? `https://${ref.host}` : ref.link}
                    size={24}
                    className="border-2 border-white"
                    fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{data.references.length} sites</span>
              <button className="ml-auto">
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="w-80 relative flex-shrink-0 max-h-[calc(100vh-100px)] overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-4 h-full">
                <div
                  className="relative h-full"
                  style={{
                    minHeight: "400px",
                  }}
                >
                  {/* Close button for expanded view */}
                  {showAllReferences && (
                    <button
                      onClick={() => setShowAllReferences(false)}
                      className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-gray-100 bg-white shadow-sm"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  )}

                  {/* Scrollable content container */}
                  <div className="h-full overflow-y-auto pr-2">
                    <div className="space-y-4">
                      {(showAllReferences || filteredReferenceIndexes ? displayedReferences : displayedReferences).map(
                        (ref, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm"
                          >
                            <div className="flex">
                              <div className="flex-1 p-2">
                                <h3 className="text-blue-700 hover:underline text-base font-medium">
                                  <TrackedLink componentName="AIMode" linkIndex={index} href={ref.link}>{ref.title}</TrackedLink>
                                </h3>
                                <p className="text-xs text-gray-700 mt-1 line-clamp-2">{ref.snippet}</p>
                                <div className="flex items-center mt-1">
                                  <WebsiteFavicon
                                    url={ref.host ? `https://${ref.host}` : ref.link}
                                    size={16}
                                    fallbackText={getWebsiteName(ref.host ? `https://${ref.host}` : ref.link).charAt(0)}
                                  />
                                  <span className="ml-2 text-xs text-gray-600">{getWebsiteName(ref.host ? `https://${ref.host}` : ref.link)}</span>
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
                        ),
                      )}

                      {/* Spacer to ensure button doesn't overlap content when scrolling */}
                      <div className="h-16"></div>
                    </div>
                  </div>

                  {/* Show all button - positioned at bottom */}
                  {!showAllReferences && !filteredReferenceIndexes && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-50 pt-2">
                      <button
                        onClick={() => {
                          setShowAllReferences(true);
                          trackShowAllClick("AiMode");
                        }}
                        className="flex items-center justify-center w-full bg-blue-100 text-blue-700 py-3 rounded-full hover:bg-blue-200"
                      >
                        <span>Show all</span>
                      </button>
                    </div>
                  )}

                  {/* Show all references button when filtered */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  )
}
