"use client"


import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TrackedLink } from "./tracked-link"

export function Pagination() {
  const pathname = usePathname()

  const pages = [1, 2, 3, 4, 5, "...", 10]

  const match = pathname.match(/^(.*?)(\/\d+)?\/?$/)
  const basePath = match?.[1] || ""
  const currentPage = parseInt(match?.[2]?.slice(1) || "1", 10)

  const previousPath = currentPage > 1 ? `${basePath}/${currentPage - 1}` : "#"
  const nextPath = currentPage < pages.length ? `${basePath}/${currentPage + 1}` : "#"

  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center">
        <TrackedLink componentName="clickPagination_" linkIndex={currentPage - 1} href={previousPath} className="flex items-center text-blue-600 mr-4 hover:underline">
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Previous</span>
        </TrackedLink>

        <div className="flex space-x-2">
          {pages.map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex items-center justify-center w-8 h-8 text-gray-600"
                >
                  ...
                </span>
              )
            }

            const href = `${basePath}/${page}`
            const isActive = pathname === href

            return (
              <TrackedLink

                componentName="clickPagination_"
                linkIndex={index}
                key={page}
                href={href}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isActive
                    ? "bg-blue-600 text-white"
                    : "text-blue-600 hover:underline"
                  }`}
              >
                {page}
              </TrackedLink>
            )
          })}
        </div>

        <TrackedLink componentName="clickPagination_" linkIndex={currentPage+1}  href={nextPath} className="flex items-center text-blue-600 ml-4 hover:underline">
          <span>Next</span>
          <ChevronRight className="h-5 w-5 ml-1" />
        </TrackedLink>
      </div>
    </div>
  )
}