"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trackLinkClick } from "@/lib/analytics";
import type { ComponentName } from "@/types/api";

type TrackedLinkProps =
  | {
      href: string;
      componentName: ComponentName;
      linkIndex: number | string;
      linkPage?: number;
      sponsored?: boolean;
      className?: string;
      children: ReactNode;
    }
  | {
      href: string;
      componentName: "clickPagination_";
      linkIndex: number | string;
      linkPage?: number;
      sponsored?: boolean;
      className?: string;
      children: ReactNode;
    };

export function TrackedLink({
  href,
  componentName,
  linkIndex,
  sponsored,
  className,
  children,
}: TrackedLinkProps) {
  const searchParams = useSearchParams();

  const handleClick = async () => {
    // Extract text content for tracking
    let linkText = "";
    if (typeof children === "string") {
      linkText = children;
    } else if (
      children &&
      typeof children === "object" &&
      "props" in children &&
      (children as { props?: { children?: string } }).props &&
      (children as { props: { children: string } }).props.children &&
      typeof (children as { props: { children: string } }).props.children ===
        "string"
    ) {
      linkText = (children as { props: { children: string } }).props.children;
    } else {
      linkText = "[Complex content]";
    }

    // 对于所有链接，让默认行为处理，但仍然追踪
    try {
      await trackLinkClick(componentName, linkIndex, linkText, sponsored);
      console.log("Link clicked and tracked:", linkText);
    } catch (error) {
      console.error("Tracking failed:", error);
    }
  };

  // Helper function to preserve RID parameter
  const preserveRidParam = (baseUrl: string): string => {
    const rid = searchParams.get("RID");
    if (!rid) return baseUrl;

    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}RID=${encodeURIComponent(rid)}`;
  };

  // 对于所有链接（包括外部链接、内部路由和静态文件），都使用iframe包装
  // 对于外部链接，使用查询参数传递URL，并保留RID参数
  const basePath =
    href.startsWith("http://") || href.startsWith("https://")
      ? `/iframe?url=${encodeURIComponent(href)}`
      : `/iframe${href}`;

  const iframePath = preserveRidParam(basePath);

  return (
    <Link href={iframePath} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
