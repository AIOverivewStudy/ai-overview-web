import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 排除静态资源路径，避免被 RSC/路由逻辑拦截
  if (request.nextUrl.pathname.startsWith('/CmuWebPageshmtl') ||
      request.nextUrl.pathname.startsWith('/AI-overviewHtml') ||
      request.nextUrl.pathname.startsWith('/AI-modeHtml') ||
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.includes('.')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // 让中间件不要匹配静态资源路径
  matcher: [
    '/((?!CmuWebPageshmtl|AI-overviewHtml|AI-modeHtml|_next/static|_next/image|favicon.ico|.*\\..*).*)' 
  ],
}
