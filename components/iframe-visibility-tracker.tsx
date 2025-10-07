'use client'

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * 追踪页面内容在视口中的可见性
 * 
 * ⚠️ 重要说明：
 * 由于浏览器的跨域安全限制，iframe 内的 JavaScript 无法直接检测 iframe 本身在父页面中的位置。
 * 
 * 这个组件采用的是"近似方案"：
 * - 检测页面顶部元素在当前窗口视口中的可见性
 * - 如果页面顶部可见 → 说明 iframe 很可能在父页面视口的可见区域
 * - 如果页面顶部不可见 → 说明用户可能滚动到了页面下方，或 iframe 被滚出父页面视口
 */
export function IframeVisibilityTracker() {
  const posthog = usePostHog()

  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastReportedState = ''
    const startTime = Date.now()

    // 创建一个顶部哨兵元素用于检测
    const sentinelTop = document.createElement('div')
    sentinelTop.style.position = 'absolute'
    sentinelTop.style.top = '0'
    sentinelTop.style.left = '0'
    sentinelTop.style.width = '1px'
    sentinelTop.style.height = '1px'
    sentinelTop.style.pointerEvents = 'none'
    document.body.prepend(sentinelTop)

    // 创建一个底部哨兵元素
    const sentinelBottom = document.createElement('div')
    sentinelBottom.style.position = 'absolute'
    sentinelBottom.style.bottom = '0'
    sentinelBottom.style.left = '0'
    sentinelBottom.style.width = '1px'
    sentinelBottom.style.height = '1px'
    sentinelBottom.style.pointerEvents = 'none'
    document.body.append(sentinelBottom)

    let topVisible = false
    let bottomVisible = false

    const observerTop = new IntersectionObserver(
      (entries) => {
        topVisible = entries[0].isIntersecting
        reportState()
      },
      { threshold: 0 }
    )

    const observerBottom = new IntersectionObserver(
      (entries) => {
        bottomVisible = entries[0].isIntersecting
        reportState()
      },
      { threshold: 0 }
    )

    const reportState = () => {
      let state = ''
      let visibilityPercentage = 0
      
      if (topVisible && bottomVisible) {
        state = 'fully_visible'
        visibilityPercentage = 100
      } else if (topVisible && !bottomVisible) {
        state = 'top_visible_bottom_cut'
        visibilityPercentage = 70 // 估算
      } else if (!topVisible && bottomVisible) {
        state = 'top_cut_bottom_visible'
        visibilityPercentage = 70 // 估算
      } else {
        state = 'not_visible'
        visibilityPercentage = 0
      }

      if (state !== lastReportedState) {
        posthog?.capture('iframe_content_visibility', {
          visibility_state: state,
          visibility_percentage: visibilityPercentage,
          top_visible: topVisible,
          bottom_visible: bottomVisible,
          time_since_load: Date.now() - startTime,
          page_url: window.location.href,
          // 额外信息：窗口尺寸
          window_height: window.innerHeight,
          document_height: document.documentElement.scrollHeight
        })

        lastReportedState = state
        
        console.log(`📊 页面可见性状态: ${state}`, {
          '顶部可见': topVisible,
          '底部可见': bottomVisible,
          '估算可见度': `${visibilityPercentage}%`
        })
      }
    }

    observerTop.observe(sentinelTop)
    observerBottom.observe(sentinelBottom)

    return () => {
      observerTop.disconnect()
      observerBottom.disconnect()
      sentinelTop.remove()
      sentinelBottom.remove()
    }
  }, [posthog])

  return null
}

