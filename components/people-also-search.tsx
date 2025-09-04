'use client'

import { usePathname } from "next/navigation"
import { Search } from "lucide-react" // optional, you can change icon
import { TrackedLink } from "./tracked-link"

interface PeopleAlsoSearchItem {
  name: string
  url?: string
  highlight?: string[]
}

export function PeopleAlsoSearch() {
  const pathname = usePathname()
  const pageName = pathname.split("/").slice(1, 2).join("-")
  const peopleAlsoSearchData = require(`@/data/${pageName}/people-also-search.json`)

  return (
    <div className="mb-8">
      <h2 className="text-2xl mb-4">People also search for</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {peopleAlsoSearchData.map((item: PeopleAlsoSearchItem, index: number) => (
          <TrackedLink
            key={index}
            href={item.url || "#"}
            componentName="PeopleAlsoSearch"
            linkIndex={index}
            className="bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-between"
          >
            <div className="text-gray-800 text-sm">
              {item.highlight ? (
                renderHighlightedText(item.name, item.highlight)
              ) : (
                item.name
              )}
            </div>
            <Search className="w-4 h-4 text-gray-500" />
          </TrackedLink>
        ))}
      </div>
    </div>
  )
}

// Helper function to bold matching phrases
function renderHighlightedText(text: string, highlights: string[]) {
  let parts: string[] = [text]

  highlights.forEach((highlight) => {
    parts = parts.flatMap((part) =>
      part.split(new RegExp(`(${escapeRegExp(highlight)})`, 'gi'))
    )
  })

  return parts.map((part, i) =>
    highlights.some(h => h.toLowerCase() === part.toLowerCase()) ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}