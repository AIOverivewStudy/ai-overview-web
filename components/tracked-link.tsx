"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { trackLinkClick } from "@/lib/analytics"
import type { ComponentName } from "@/types/api"

interface TrackedLinkProps {
  href: string
  componentName: ComponentName
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
      (children as { props?: { children?: string } }).props &&
      (children as { props: { children: string } }).props.children &&
      typeof (children as { props: { children: string } }).props.children === "string"
    ) {
      linkText = (children as { props: { children: string } }).props.children
    } else {
      linkText = "[Complex content]"
    }

    // 对于所有链接，让默认行为处理，但仍然追踪
    try {
      await trackLinkClick(componentName, linkIndex, linkText)
      console.log("Link clicked and tracked:", linkText);
    } catch (error) {
      console.error("Tracking failed:", error)
    }
  }

  // 对于所有链接（包括外部链接、内部路由和静态文件），都使用iframe包装
  // 对于外部链接，使用查询参数传递URL
  const iframePath = href.startsWith('http://') || href.startsWith('https://') 
    ? `/iframe?url=${encodeURIComponent(href)}` 
    : `/iframe${href}`
    
  return (
    <Link href={iframePath} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
