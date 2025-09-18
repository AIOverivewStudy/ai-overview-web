"use client"

import { useState, useRef } from "react"
import { Search, X, Mic, Camera, AlertCircle } from "lucide-react"

interface SearchBarProps {
  defaultValue?: string
}

export function SearchBar({ defaultValue = "" }: SearchBarProps) {
  const [query] = useState(defaultValue)
  const [showPopup, setShowPopup] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleInputInteraction = () => {
    setShowPopup(true)
    
    // Auto hide after 3 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setShowPopup(false)
    }, 3000)
  }

  const hidePopup = () => {
    setShowPopup(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  return (
    <div className="flex-1 max-w-3xl">
      <div className="relative">
        <div className="flex items-center bg-white rounded-full px-4 py-2 border border-gray-300 shadow-md focus-within:border-blue-500 focus-within:shadow-lg hover:shadow-lg">
          <Search className="h-5 w-5 text-gray-500 mr-2" />
          <input
            type="text"
            value={query}
            readOnly
            className="flex-1 bg-transparent outline-none text-gray-800 cursor-not-allowed"
            placeholder="Search Google or type a URL"
            onClick={handleInputInteraction}
            onFocus={handleInputInteraction}
            onKeyDown={handleInputInteraction}
          />
          {query && (
            <button className="p-1 mr-1">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
          <div className="h-5 border-r border-gray-300 mx-2"></div>
          <button 
            className="p-1 mr-1"
            onClick={handleInputInteraction}
          >
            <Mic className="h-5 w-5 text-blue-500" />
          </button>
          <button 
            className="p-1"
            onClick={handleInputInteraction}
          >
            <Camera className="h-5 w-5 text-blue-500" />
          </button>
        </div>

        {/* Popup notification */}
        {showPopup && (
          <div className="absolute top-full left-4 mt-2 z-50">
            <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 min-w-72">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-sm">
                Search functionality is disabled in this research interface. Please use the provided search results below.
              </span>
              <button 
                onClick={hidePopup}
                className="ml-2 text-gray-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Arrow pointing up */}
            <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-800 transform rotate-45"></div>
          </div>
        )}
      </div>
    </div>
  )
}