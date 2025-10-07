'use client'

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * 追踪 iframe 在父页面视口中的可见性
 * 用于检测用户在 Qualtrics 问卷上滚动时，我们的内容占据视口的比例
 */
export function IframeVisibilityTracker() {
  const posthog = usePostHog()

  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastReportedRatio = -1
    const startTime = Date.now()

    // 创建 Intersection Observer 监听 iframe 在父页面视口中的可见性
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visibilityRatio = Math.round(entry.intersectionRatio * 100)
          
          // 只在可见比例变化超过 5% 时上报，避免过于频繁
          const ratioChanged = Math.abs(visibilityRatio - lastReportedRatio) >= 5

          if (ratioChanged) {
            posthog?.capture('iframe_visibility_change', {
              visibility_percentage: visibilityRatio,
              is_fully_visible: entry.intersectionRatio === 1,
              is_partially_visible: entry.isIntersecting && entry.intersectionRatio < 1,
              is_hidden: !entry.isIntersecting,
              time_since_load: Date.now() - startTime,
              viewport_position: {
                top: entry.boundingClientRect.top,
                bottom: entry.boundingClientRect.bottom,
                height: entry.boundingClientRect.height
              },
              page_url: window.location.href
            })

            lastReportedRatio = visibilityRatio
            
            // 调试日志
            console.log(`📊 Iframe 可见性: ${visibilityRatio}%`, {
              完全可见: entry.intersectionRatio === 1,
              部分可见: entry.isIntersecting && entry.intersectionRatio < 1,
              完全隐藏: !entry.isIntersecting
            })
          }
        })
      },
      {
        // 设置多个阈值，以便捕获细粒度的可见性变化
        threshold: [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
        // root: null 表示相对于浏览器视口（这会检测iframe在父页面中的位置）
        root: null,
        rootMargin: '0px'
      }
    )

    // 观察整个文档的根元素
    if (document.documentElement) {
      observer.observe(document.documentElement)
    }

    return () => {
      observer.disconnect()
    }
  }, [posthog])

  return null // 这是一个纯追踪组件，不渲染任何UI
}

