"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { trackLinkClick } from "@/lib/analytics"

interface TrackedLinkProps {
  href: string
  componentName: string
  linkIndex: number
  linkPage?: number
  className?: string
  children: ReactNode
}

export function TrackedLink ({ href, componentName, linkIndex, className, children }: TrackedLinkProps) {
  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // 阻止默认的跳转行为
    event.preventDefault()
    
    // Extract text content for tracking
    let linkText = ""
    if (typeof children === "string") {
      linkText = children
    } else if (
      children &&
      typeof children === "object" &&
      "props" in children &&
      (children as { props?: { children?: string } }).props &&
      (children as { props: { children: string } }).props.children &&
      typeof (children as { props: { children: string } }).props.children === "string"
    ) {
      linkText = (children as { props: { children: string } }).props.children
    } else {
      linkText = "[Complex content]"
    }

    try {
      // 等待追踪完成
      const result = await trackLinkClick(componentName, linkIndex, linkText)
      console.log("Tracking result:", result);
      
      // 追踪完成后进行跳转
      if (href.startsWith('http://') || href.startsWith('https://') || href.includes('.html')) {
        // 外部链接或静态文件，使用 window.open
        window.open(href, '_blank', 'noopener,noreferrer')
      } else {
        // 内部路由，使用 window.location
        window.location.href = href
      }
    } catch (error) {
      console.error("Tracking failed:", error)
      // 即使追踪失败，也要进行跳转（用户体验优先）
      if (href.startsWith('http://') || href.startsWith('https://') || href.includes('.html')) {
        window.open(href, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = href
      }
    }
  }

  // 检查是否是静态 HTML 文件或外部链接
  const isStaticHtml = href.includes('.html') || 
                       href.includes('/CmuWebPageshmtl/') || 
                       href.includes('/AI-overviewHtml/') || 
                       href.includes('/AI-modeHtml/') ||
                       href.startsWith('http://') ||
                       href.startsWith('https://')

  // 对于静态 HTML 文件或外部链接，使用原生 a 标签
  if (isStaticHtml) {
    return (
      <a 
        href={href} 
        className={className} 
        onClick={handleClick} 
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    )
  }

  // 对于正常的路由链接，使用 Next.js Link
  return (
    <Link href={href} className={className} onClick={handleClick} rel="noopener noreferrer">
      {children}
    </Link>
  )
}
