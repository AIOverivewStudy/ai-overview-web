'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, ChevronUp, ExternalLink } from "lucide-react"
import { TrackedLink } from "@/components/tracked-link"

export function DiscussionsAndForums() {
  const pathname = usePathname();
  const pageName = pathname.split("/").slice(1, 2).join("-");
  const discussionData = require(`@/data/${pageName}/discussions-and-forums.json`);

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleDropdown = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const getSourceIcon = (source: string) => {
    if (source === "Reddit") return "/icons/reddit.png" // Add this in your public folder
    if (source === "Quora") return "/icons/quora.png"
    return null
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl mb-4 font-semibold">Discussions and forums</h2>

      <div className="space-y-6">
        {discussionData.map((item: any, index: number) => (
          <div key={index} className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <TrackedLink componentName="DiscussionsForums" linkIndex={index} href={item.url} className="text-blue-700 text-sm md:text-base font-medium hover:underline">
                  {item.title}
                </TrackedLink>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  {getSourceIcon(item.source) && (
                    <img src={getSourceIcon(item.source) as string} alt={item.source} className="w-4 h-4" />
                  )}
                  <span className="font-medium">{item.source}</span>
                  <span>•</span>
                  <span>{item.note.join(" • ")}</span>
                </div>
              </div>

              <button
                onClick={() => toggleDropdown(index)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                {openIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            {openIndex === index && (
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                {item.dropdown.map((answer: any, idx: number) => (
                  <div key={idx} className="text-sm rounded-md p-3 bg-gray-50 relative">
                    {answer["Top answer"] && (
                      <div className="text-xs text-black font-medium mb-2">
                        ✅ Top answer
                      </div>
                    )}
                    <Link href={answer.url} className="hover:underline block mb-2">
                      {answer.text}
                    </Link>
                    {answer.note && (
                      <div className="text-xs text-gray-500">{answer.note.join(" • ")}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button className="px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 flex items-center gap-2">
          See more <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}