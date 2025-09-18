"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface IframeSearchParamsProps {
  onUrlReady: (url: string) => void
}

export function IframeSearchParams({ onUrlReady }: IframeSearchParamsProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = searchParams.get('url')
    if (url) {
      onUrlReady(decodeURIComponent(url))
    }
  }, [searchParams, onUrlReady])

  return null
}
