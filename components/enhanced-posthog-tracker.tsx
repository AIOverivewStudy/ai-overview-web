"use client";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

export function EnhancedPostHogTracker() {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;

    // 全局点击事件监听器 - 捕获所有点击事件
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      // 获取元素信息
      const elementInfo = {
        tag_name: target.tagName?.toLowerCase(),
        element_id: target.id || undefined,
        element_class: target.className || undefined,
        element_text: target.textContent?.trim().substring(0, 100) || undefined,
        element_href: (target as HTMLAnchorElement).href || undefined,
        element_type: (target as HTMLInputElement).type || undefined,
        element_placeholder: (target as HTMLInputElement).placeholder || undefined,
        
        // 父元素信息
        parent_tag: target.parentElement?.tagName?.toLowerCase(),
        parent_class: target.parentElement?.className || undefined,
        parent_id: target.parentElement?.id || undefined,
        
        // 位置信息
        click_x: event.clientX,
        click_y: event.clientY,
        page_x: event.pageX,
        page_y: event.pageY,
        
        // 页面信息
        page_url: window.location.href,
        page_title: document.title,
        timestamp: new Date().toISOString(),
        
        // 用户代理和设备信息
        user_agent: navigator.userAgent,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
      };

      // 发送到PostHog
      posthog.capture('$web_click_enhanced', elementInfo);
    };

    // 右键点击事件
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      posthog.capture('$right_click', {
        tag_name: target.tagName?.toLowerCase(),
        element_text: target.textContent?.trim().substring(0, 100),
        click_x: event.clientX,
        click_y: event.clientY,
        page_url: window.location.href,
      });
    };

    // 键盘事件
    const handleKeyPress = (event: KeyboardEvent) => {
      posthog.capture('$key_press', {
        key: event.key,
        code: event.code,
        alt_key: event.altKey,
        ctrl_key: event.ctrlKey,
        shift_key: event.shiftKey,
        meta_key: event.metaKey,
        page_url: window.location.href,
      });
    };

    // 滚动事件 (节流处理)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        posthog.capture('$scroll', {
          scroll_x: window.scrollX,
          scroll_y: window.scrollY,
          scroll_percentage: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
          page_url: window.location.href,
        });
      }, 1000); // 1秒节流
    };

    // 鼠标移动事件 (大量节流处理)
    let mouseMoveTimeout: NodeJS.Timeout;
    const handleMouseMove = (event: MouseEvent) => {
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        posthog.capture('$mouse_move', {
          mouse_x: event.clientX,
          mouse_y: event.clientY,
          page_url: window.location.href,
        });
      }, 5000); // 5秒节流，避免过多事件
    };

    // 页面可见性变化
    const handleVisibilityChange = () => {
      posthog.capture('$visibility_change', {
        hidden: document.hidden,
        visibility_state: document.visibilityState,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    };

    // 窗口大小变化
    const handleResize = () => {
      posthog.capture('$window_resize', {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        page_url: window.location.href,
      });
    };

    // 添加事件监听器
    document.addEventListener('click', handleGlobalClick, true); // 使用捕获阶段确保捕获所有点击
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);

    // 发送页面加载完成事件
    posthog.capture('$page_loaded_enhanced', {
      page_url: window.location.href,
      page_title: document.title,
      load_time: performance.now(),
      user_agent: navigator.userAgent,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      timestamp: new Date().toISOString(),
    });

    // 清理函数
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      clearTimeout(scrollTimeout);
      clearTimeout(mouseMoveTimeout);
    };
  }, [posthog]);

  return null;
}
