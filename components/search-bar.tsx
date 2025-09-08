"use client"

import { useState } from "react"
import { Search, X, Mic, Camera } from "lucide-react"

interface SearchBarProps {
  defaultValue?: string
}

export function SearchBar({ defaultValue = "" }: SearchBarProps) {
  const [query] = useState(defaultValue)

  return (
    <div className="flex-1 max-w-3xl">
      <div className="relative">
        <div className="flex items-center bg-white rounded-full px-4 py-2 border border-gray-300 shadow-md focus-within:border-blue-500 focus-within:shadow-lg hover:shadow-lg">
          <Search className="h-5 w-5 text-gray-500 mr-2" />
          <input
            type="text"
            value={query}
            readOnly
            className="flex-1 bg-transparent outline-none text-gray-800"
            placeholder="Search Google or type a URL"
          />
          {query && (
            <button className="p-1 mr-1">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
          <div className="h-5 border-r border-gray-300 mx-2"></div>
          <button className="p-1 mr-1">
            <Mic className="h-5 w-5 text-blue-500" />
          </button>
          <button className="p-1">
            <Camera className="h-5 w-5 text-blue-500" />
          </button>
        </div>
      </div>
    </div>
  )
}