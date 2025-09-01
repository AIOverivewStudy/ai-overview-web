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
  const handleClick = async () => {
    // Extract text content for tracking
    let linkText = ""
    if (typeof children === "string") {
      linkText = children
    } else if (
      children &&
      typeof children === "object" &&
      "props" in children &&
      (children as any).props &&
      (children as any).props.children &&
      typeof (children as any).props.children === "string"
    ) {
      linkText = (children as any).props.children
    } else {
      linkText = "[Complex content]"
    }

    const result = await trackLinkClick(componentName, linkIndex, linkText, href)
    console.log("Tracking result:", result);
    
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
