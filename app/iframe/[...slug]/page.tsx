"use client"

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

// 检查是否是静态HTML文件
function isStaticHtmlFile(path: string): boolean {
  return path.includes('.html') || 
         path.includes('/CmuWebPageshmtl/') || 
         path.includes('/AI-overviewHtml/') || 
         path.includes('/AI-modeHtml/')
}

// 检查是否是外部链接
function isExternalLink(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

// 根据路径推断返回地址的工具函数
function getBackUrlFromPath(fullPath: string): string {
  // 如果是外部链接，默认返回首页
  if (isExternalLink(fullPath)) {
    return '/'
  }
  
  // 如果是静态HTML文件，使用原有的逻辑
  if (isStaticHtmlFile(fullPath)) {
    const pathParts = fullPath.split('/')
    const productIndex = pathParts.findIndex(part => part === 'product')
    const infoIndex = pathParts.findIndex(part => part === 'info')
    
    // 获取topic
    const topicIndex = Math.max(productIndex, infoIndex)
    const topic = topicIndex > 0 ? pathParts[topicIndex + 1] : null
    
    if (!topic) return '/'
    
    // 根据不同的HTML目录返回不同的路径
    if (fullPath.includes('/AI-modeHtml/')) {
      return `/${topic}/ai-mode`
    } else {
      return `/${topic}`
    }
  }
  
  // 对于Next.js路由页面，尝试推断父路径
  const pathParts = fullPath.split('/').filter(part => part)
  
  if (pathParts.length <= 1) {
    return '/' // 如果是根路径或单级路径，返回首页
  }
  
  // 移除最后一个路径段作为返回地址
  const parentPath = '/' + pathParts.slice(0, -1).join('/')
  return parentPath
}

export default function IframePage() {
  const params = useParams()
  const router = useRouter()
  const [iframeUrl, setIframeUrl] = useState<string>('')
  const [backUrl, setBackUrl] = useState<string>('/')
  const [isIframeContent, setIsIframeContent] = useState(false)

  useEffect(() => {
    // 检查是否是被iframe嵌套的内容
    const urlParams = new URLSearchParams(window.location.search)
    setIsIframeContent(urlParams.get('iframe') === 'true')
    
    // 检查是否是外部链接（通过查询参数传递）
    const externalUrl = urlParams.get('url')
    if (externalUrl) {
      setIframeUrl(decodeURIComponent(externalUrl))
      setBackUrl('/') // 外部链接默认返回首页
    } else if (params.slug && Array.isArray(params.slug)) {
      // 内部链接处理
      const fullPath = '/' + params.slug.join('/')
      setIframeUrl(fullPath)
      setBackUrl(getBackUrlFromPath(fullPath))
    }
  }, [params.slug])

  const handleBack = () => {
    // 优先使用浏览器历史记录
    if (window.history.length > 1) {
      router.back()
    } else {
      // 否则导航到推断的返回地址
      router.push(backUrl)
    }
  }

  if (!iframeUrl) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>
  }

  // 检查链接类型
  const isStatic = isStaticHtmlFile(iframeUrl)
  const isExternal = isExternalLink(iframeUrl)

  // 如果是iframe内容，直接重定向到原始URL
  if (isIframeContent) {
    router.replace(iframeUrl)
    return <div className="min-h-screen bg-white flex items-center justify-center">Redirecting...</div>
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* 返回按钮 */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 md:gap-3 bg-blue-600 text-white border-0 rounded-xl px-4 py-2.5 md:px-5 md:py-3 shadow-2xl hover:shadow-2xl hover:bg-blue-700 transition-all duration-300 hover:-translate-y-1 hover:scale-105 font-semibold text-sm md:text-base ring-2 ring-blue-200 backdrop-blur-sm"
          title="Return to previous page"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Back</span>
          <span className="sm:hidden">←</span>
        </button>
      </div>

      {/* 内容容器 */}
      <div className="w-full h-screen">
        {isExternal ? (
          // 外部链接使用iframe
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title="External Content"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-top-navigation"
            loading="lazy"
          />
        ) : isStatic ? (
          // 静态HTML文件使用iframe
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title="Static Content"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            loading="lazy"
          />
        ) : (
          // Next.js路由也使用iframe，但添加查询参数避免递归
          <iframe
            src={`${iframeUrl}?iframe=true`}
            className="w-full h-full border-0"
            title="Internal Route Content"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            loading="lazy"
          />
        )}
      </div>
    </div>
  )
}
