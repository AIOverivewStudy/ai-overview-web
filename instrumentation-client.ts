import posthog from "posthog-js"

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: '2025-05-24',
  capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
  debug: process.env.NODE_ENV === "development",
  
  // 自动捕获所有点击事件和用户交互
  autocapture: true, // 启用自动捕获
  capture_pageview: true, // 自动捕获页面浏览
  capture_pageleave: true, // 自动捕获页面离开
  
  // 详细的自动捕获配置
  property_denylist: [], // 不过滤任何属性
  
  // 捕获额外的元素信息
  mask_all_element_attributes: false, // 不遮罩元素属性
  mask_all_text: false, // 不遮罩文本内容
  
  // 捕获性能和网络事件
  capture_performance: true, // 捕获性能指标
  
  // 捕获更多上下文信息
  cross_subdomain_cookie: false,
  secure_cookie: false,
})
