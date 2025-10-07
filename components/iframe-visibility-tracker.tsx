'use client'

import { useEffect, useRef } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * 追踪 iframe 在父页面视口中的可见性比例
 * 
 * 💡 工作原理：
 * 创建一个和整个页面等高的哨兵元素（从 top:0 到 bottom:0）
 * 使用 IntersectionObserver 检测这个元素的 intersectionRatio
 * 
 * intersectionRatio 表示：元素有多少比例在视口内
 * - 1.0 (100%) = iframe 完全可见
 * - 0.5 (50%) = iframe 有一半在视口内
 * - 0.0 (0%) = iframe 完全不可见
 * 
 * ✅ 这个方案的优势：
 * - 直接获得精确的可见比例
 * - 无论用户在 Qualtrics 上如何滚动，都能准确追踪
 * - 无需复杂的计算和推断
 */
export function IframeVisibilityTracker() {
  const posthog = usePostHog()
  const lastReportedRatioRef = useRef<number>(-1)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    startTimeRef.current = Date.now()

    // 创建一个覆盖整个页面高度的哨兵元素
    const sentinel = document.createElement('div')
    sentinel.style.position = 'absolute'
    sentinel.style.top = '0'
    sentinel.style.left = '0'
    sentinel.style.width = '100%'
    sentinel.style.height = '100%'  // 关键：和整个文档等高
    sentinel.style.pointerEvents = 'none'  // 不影响用户交互
    sentinel.style.zIndex = '-1'  // 放在最底层
    sentinel.style.opacity = '0'  // 完全透明
    document.body.appendChild(sentinel)

    // 使用 IntersectionObserver 观察这个哨兵元素
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visibilityRatio = entry.intersectionRatio
          const visibilityPercentage = Math.round(visibilityRatio * 100)
          
          // 只在可见比例变化超过 5% 时上报，避免过于频繁
          const ratioChanged = Math.abs(visibilityPercentage - lastReportedRatioRef.current) >= 5

          if (ratioChanged) {
            const isInIframe = window.self !== window.top
            
            posthog?.capture('iframe_visibility_ratio', {
              visibility_percentage: visibilityPercentage,
              visibility_ratio: visibilityRatio.toFixed(3),
              is_fully_visible: visibilityRatio >= 0.99,
              is_partially_visible: visibilityRatio > 0 && visibilityRatio < 0.99,
              is_hidden: visibilityRatio === 0,
              is_in_iframe: isInIframe,
              time_since_load: Date.now() - startTimeRef.current,
              viewport_info: {
                viewport_height: window.innerHeight,
                document_height: document.documentElement.scrollHeight,
                bounding_rect_top: entry.boundingClientRect.top,
                bounding_rect_bottom: entry.boundingClientRect.bottom,
                intersection_rect_height: entry.intersectionRect.height
              },
              page_url: window.location.href
            })

            lastReportedRatioRef.current = visibilityPercentage
            
            // 调试日志
            console.log(`📊 Iframe 可见性: ${visibilityPercentage}%`, {
              '精确比例': visibilityRatio.toFixed(3),
              '完全可见': visibilityRatio >= 0.99,
              '部分可见': visibilityRatio > 0 && visibilityRatio < 0.99,
              '完全隐藏': visibilityRatio === 0,
              '在iframe中': isInIframe,
              '视口高度': window.innerHeight,
              '文档高度': document.documentElement.scrollHeight
            })
          }
        })
      },
      {
        // 设置多个阈值，捕获细粒度的可见性变化
        threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 
                    0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
        root: null,  // 相对于视口
        rootMargin: '0px'
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      sentinel.remove()
    }
  }, [posthog])

  return null
}

