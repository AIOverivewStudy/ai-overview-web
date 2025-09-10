"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getFaviconUrl, extractDomain } from "@/lib/favicon-service"

interface WebsiteFaviconProps {
  url: string
  size?: number
  className?: string
  fallbackText?: string
}

export function WebsiteFavicon({ url, size = 24, className = "", fallbackText }: WebsiteFaviconProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const faviconUrl = getFaviconUrl(url, size)
  const domain = extractDomain(url)
  const fallback = fallbackText || domain.charAt(0).toUpperCase()

  const handleImageError = () => {
    setImageError(true)
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  if (imageError || !domain) {
    // Fallback to colored circle with first letter
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-gray-500",
    ]
    const colorIndex = domain.length % colors.length
    const bgColor = colors[colorIndex]

    return (
      <div
        className={`${bgColor} rounded-full flex items-center justify-center text-white font-bold text-xs ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallback}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {isMounted && isLoading && <div className="bg-gray-200 rounded-full animate-pulse" style={{ width: size, height: size }} />}
      <Image
        src={faviconUrl || "/placeholder.svg"}
        alt={`${domain} favicon`}
        width={size}
        height={size}
        className={`rounded-full ${isMounted && isLoading ? "opacity-0" : "opacity-100"} transition-opacity`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        unoptimized // Since we're loading external favicons
      />
    </div>
  )
}
