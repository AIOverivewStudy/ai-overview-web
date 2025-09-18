"use client"

import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Clock } from 'lucide-react'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { IframeSearchParams } from '@/components/iframe-search-params'

function ExternalResourcePageContent() {
  const router = useRouter()
  const [externalUrl, setExternalUrl] = useState<string>('')
  const [countdown, setCountdown] = useState(5)

  const handleBack = useCallback(() => {
    // 优先使用浏览器历史记录
    if (window.history.length > 1) {
      router.back()
    } else {
      // 否则返回首页
      router.push('/')
    }
  }, [router])

  const handleUrlReady = useCallback((url: string) => {
    setExternalUrl(url)
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // 倒计时结束，自动返回
      handleBack()
    }
  }, [countdown, handleBack])

  if (!externalUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <IframeSearchParams onUrlReady={handleUrlReady} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        {/* 主要内容卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-200">
          {/* 图标 */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <ExternalLink className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              External Link Restricted
            </h1>
            <p className="text-gray-600">
              This is a research simulation platform. External links are disabled to help you focus on the curated academic content available within this site.
            </p>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-2">
              💡 Research Tip
            </p>
            <p className="text-sm text-blue-700">
              Try exploring the search results within this platform to find the information you need.
            </p>
          </div>

          {/* 倒计时提示 */}
          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Returning to search results in {countdown} seconds</span>
          </div>

          {/* 操作按钮 */}
          <button
            onClick={handleBack}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Search Results
          </button>

          {/* 底部提示 */}
          <p className="mt-6 text-xs text-gray-400">
            Continue exploring the academic content curated for your research.
          </p>
        </div>
      </div>
    </>
  )
}

export default function ExternalResourcePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <ExternalResourcePageContent />
    </Suspense>
  )
}
