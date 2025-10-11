"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { getCurrentTaskSession } from "@/lib/analytics";
import type { TaskSession } from "@/types/api";

interface EngagementMetrics {
  totalTimeOnPage: number;
  activeTime: number;
  idleTime: number;
  visibilityChanges: number;
  scrollDepth: number;
  interactions: number;
  sessionStart: number;
  lastActivity: number;
}

interface EngagementData extends EngagementMetrics {
  url: string;
  userAgent: string;
  referrer: string;
  sessionId: string;
}

interface EngagementEvent {
  type: "page_engagement";
  data: EngagementData;
  taskSession?: TaskSession | null;
  pageContext?: string;
}

interface PageState {
  isVisible: boolean;
  isActive: boolean;
  lastActiveTime: number;
  lastVisibilityChange: number;
  maxScrollDepth: number;
  sessionId: string;
}

interface TimerRefs {
  activityTimer: NodeJS.Timeout | null;
  heartbeatTimer: NodeJS.Timeout | null;
}

interface EngagementTrackerConfig {
  inactivityThreshold?: number;
  heartbeatInterval?: number;
  throttleDelay?: number;
  debounceDelay?: number;
  apiEndpoint?: string;
  enableConsoleLogging?: boolean;
}

type UserActivityEvent =
  | "click"
  | "mousedown"
  | "mousemove"
  | "keypress"
  | "scroll"
  | "touchstart";

interface TrackerState {
  isInitialized: boolean;
  isTracking: boolean;
  hasError: boolean;
  lastError?: Error;
}

const DEFAULT_CONFIG: Required<EngagementTrackerConfig> = {
  inactivityThreshold: 30000, // 30秒
  heartbeatInterval: 30000, // 30秒
  throttleDelay: 100, // 100ms
  debounceDelay: 100, // 100ms
  apiEndpoint: "/api/analytics/engagement",
  enableConsoleLogging: false,
};

interface PageEngagementTrackerProps {
  config?: Partial<EngagementTrackerConfig>;
}

export function PageEngagementTracker({
  config = {},
}: PageEngagementTrackerProps = {}) {
  const finalConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config],
  );

  const engagementData = useRef<EngagementMetrics>({
    totalTimeOnPage: 0,
    activeTime: 0,
    idleTime: 0,
    visibilityChanges: 0,
    scrollDepth: 0,
    interactions: 0,
    sessionStart: Date.now(),
    lastActivity: Date.now(),
  });

  const timers = useRef<TimerRefs>({
    activityTimer: null,
    heartbeatTimer: null,
  });

  const state = useRef<PageState>({
    isVisible: true,
    isActive: true,
    lastActiveTime: Date.now(),
    lastVisibilityChange: Date.now(),
    maxScrollDepth: 0,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  });

  const trackerState = useRef<TrackerState>({
    isInitialized: false,
    isTracking: false,
    hasError: false,
  });

  // 当前任务会话信息
  const taskSession = useRef<TaskSession | null>(null);

  // 工具函数：节流
  const throttle = useCallback(
    <T extends unknown[]>(func: (...args: T) => void, limit: number) => {
      let inThrottle = false;
      return (...args: T) => {
        if (!inThrottle) {
          func(...args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },
    [],
  );

  // 工具函数：防抖
  const debounce = useCallback(
    <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return (...args: T) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    },
    [],
  );

  // 获取当前页面上下文
  const getCurrentPageContext = useCallback(() => {
    const url = window.location.href;
    if (url.includes("/ai-mode")) {
      return "ai_mode";
    } else if (url.includes("search") || url.includes("topic")) {
      return "search_results";
    }
    return "other";
  }, []);

  // 记录错误
  const logError = useCallback(
    (error: Error, context: string) => {
      trackerState.current.hasError = true;
      trackerState.current.lastError = error;

      if (finalConfig.enableConsoleLogging) {
        console.error(`[PageEngagementTracker] ${context}:`, error);
      }
    },
    [finalConfig.enableConsoleLogging],
  );

  // 发送数据到服务器
  const sendEngagementData = useCallback(
    async (finalData = false) => {
      if (!trackerState.current.isTracking) return;

      try {
        const currentTime = Date.now();
        const data = engagementData.current;

        // 计算总停留时间
        data.totalTimeOnPage = currentTime - data.sessionStart;

        // 如果页面当前可见且活跃，更新活跃时间
        if (state.current.isVisible && state.current.isActive) {
          data.activeTime += currentTime - state.current.lastActiveTime;
          state.current.lastActiveTime = currentTime;
        }

        // 计算空闲时间
        data.idleTime = data.totalTimeOnPage - data.activeTime;

        // 更新滚动深度
        data.scrollDepth = Math.max(
          data.scrollDepth,
          state.current.maxScrollDepth,
        );

        const engagementDataFull: EngagementData = {
          ...data,
          url: window.location.href,
          userAgent: navigator.userAgent,
          referrer: document.referrer || "",
          sessionId: state.current.sessionId,
        };

        const eventData: EngagementEvent = {
          type: "page_engagement",
          data: engagementDataFull,
        };

        // 添加任务会话信息
        const payloadWithTask = {
          ...eventData,
          taskSession: taskSession.current,
          pageContext: getCurrentPageContext(),
        };

        if (finalConfig.enableConsoleLogging) {
          console.log("[PageEngagementTracker] Sending data:", {
            taskId: taskSession.current?.task_id,
            participantId: taskSession.current?.participant_id,
            activeTime: Math.round(data.activeTime / 1000) + "s",
            totalTime: Math.round(data.totalTimeOnPage / 1000) + "s",
            engagementRate:
              Math.round((data.activeTime / data.totalTimeOnPage) * 100) + "%",
            scrollDepth: data.scrollDepth + "%",
            interactions: data.interactions,
            pageContext: getCurrentPageContext(),
          });
        }

        // 使用 sendBeacon 确保数据能够发送，即使在页面卸载时
        if (navigator.sendBeacon && finalData) {
          const success = navigator.sendBeacon(
            finalConfig.apiEndpoint,
            JSON.stringify(payloadWithTask),
          );
          if (!success && finalConfig.enableConsoleLogging) {
            console.warn(
              "[PageEngagementTracker] sendBeacon failed, data may be lost",
            );
          }
        } else {
          // 常规情况下使用 fetch
          const response = await fetch(finalConfig.apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadWithTask),
            keepalive: finalData, // 页面卸载时保持请求活跃
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
      } catch (error) {
        logError(error as Error, "Failed to send engagement data");
      }
    },
    [
      finalConfig.apiEndpoint,
      finalConfig.enableConsoleLogging,
      logError,
      getCurrentPageContext,
    ],
  );

  // 处理页面可见性变化
  const handleVisibilityChange = useCallback(() => {
    const currentTime = Date.now();
    const wasVisible = state.current.isVisible;
    const isNowVisible = !document.hidden;

    if (wasVisible && !isNowVisible) {
      // 页面变为不可见
      if (state.current.isActive) {
        engagementData.current.activeTime +=
          currentTime - state.current.lastActiveTime;
      }
      state.current.isVisible = false;
      engagementData.current.visibilityChanges++;

      if (finalConfig.enableConsoleLogging) {
        console.log("[PageEngagementTracker] Page became hidden");
      }
    } else if (!wasVisible && isNowVisible) {
      // 页面变为可见
      state.current.isVisible = true;
      state.current.lastActiveTime = currentTime;
      state.current.lastVisibilityChange = currentTime;
      engagementData.current.visibilityChanges++;

      if (finalConfig.enableConsoleLogging) {
        console.log("[PageEngagementTracker] Page became visible");
      }
    }
  }, [finalConfig.enableConsoleLogging]);

  // 处理用户活动
  const handleUserActivity = useCallback(() => {
    if (!trackerState.current.isTracking) return;

    const currentTime = Date.now();

    if (!state.current.isActive) {
      // 从非活跃状态恢复
      state.current.isActive = true;
      state.current.lastActiveTime = currentTime;

      if (finalConfig.enableConsoleLogging) {
        console.log("[PageEngagementTracker] User became active");
      }
    }

    engagementData.current.lastActivity = currentTime;
    engagementData.current.interactions++;

    // 重置非活跃计时器
    if (timers.current.activityTimer) {
      clearTimeout(timers.current.activityTimer);
    }

    // 设定时间后标记为非活跃
    timers.current.activityTimer = setTimeout(() => {
      if (state.current.isActive && state.current.isVisible) {
        const inactiveTime = Date.now();
        engagementData.current.activeTime +=
          inactiveTime - state.current.lastActiveTime;
      }
      state.current.isActive = false;

      if (finalConfig.enableConsoleLogging) {
        console.log("[PageEngagementTracker] User became inactive");
      }
    }, finalConfig.inactivityThreshold);
  }, [finalConfig.inactivityThreshold, finalConfig.enableConsoleLogging]);

  // 处理滚动
  const handleScroll = useCallback(() => {
    if (!trackerState.current.isTracking) return;

    try {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent =
        docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      state.current.maxScrollDepth = Math.max(
        state.current.maxScrollDepth,
        scrollPercent,
      );
      handleUserActivity();
    } catch (error) {
      logError(error as Error, "Error calculating scroll depth");
    }
  }, [handleUserActivity, logError]);

  // 初始化追踪器
  const initializeTracker = useCallback(async () => {
    if (trackerState.current.isInitialized) return;

    try {
      // 获取当前任务会话
      try {
        const currentTask = await getCurrentTaskSession();
        taskSession.current = currentTask;

        if (finalConfig.enableConsoleLogging) {
          console.log("[PageEngagementTracker] Task session loaded:", {
            taskId: currentTask.task_id,
            participantId: currentTask.participant_id,
            treatmentGroup: currentTask.treatment_group,
            taskTopic: currentTask.task_topic,
          });
        }
      } catch (taskError) {
        logError(taskError as Error, "Failed to load task session");
        // 继续初始化，但没有任务上下文
      }

      // 初始化状态
      state.current.lastActiveTime = Date.now();
      state.current.isVisible = !document.hidden;
      trackerState.current.isInitialized = true;
      trackerState.current.isTracking = true;

      if (finalConfig.enableConsoleLogging) {
        console.log(
          "[PageEngagementTracker] Initialized with config:",
          finalConfig,
        );
      }
    } catch (error) {
      logError(error as Error, "Failed to initialize tracker");
    }
  }, [finalConfig, logError]);

  // 清理追踪器
  const cleanupTracker = useCallback(() => {
    trackerState.current.isTracking = false;

    // 发送最终数据
    if (state.current.isActive && state.current.isVisible) {
      const currentTime = Date.now();
      engagementData.current.activeTime +=
        currentTime - state.current.lastActiveTime;
    }
    sendEngagementData(true);

    // 清理定时器
    if (timers.current.activityTimer) {
      clearTimeout(timers.current.activityTimer);
      timers.current.activityTimer = null;
    }
    if (timers.current.heartbeatTimer) {
      clearInterval(timers.current.heartbeatTimer);
      timers.current.heartbeatTimer = null;
    }

    if (finalConfig.enableConsoleLogging) {
      console.log("[PageEngagementTracker] Cleaned up");
    }
  }, [sendEngagementData, finalConfig.enableConsoleLogging]);

  useEffect(() => {
    initializeTracker();

    // 创建节流和防抖处理的事件处理器
    const throttledScroll = throttle(handleScroll, finalConfig.throttleDelay);
    const debouncedActivity = debounce(
      handleUserActivity,
      finalConfig.debounceDelay,
    );
    const throttledMouseMove = throttle(debouncedActivity, 1000); // 鼠标移动单独节流

    // 页面可见性事件
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 窗口焦点事件
    window.addEventListener("focus", handleUserActivity);
    window.addEventListener("blur", () => {
      if (state.current.isActive && state.current.isVisible) {
        const currentTime = Date.now();
        engagementData.current.activeTime +=
          currentTime - state.current.lastActiveTime;
      }
      state.current.isActive = false;
    });

    // 用户交互事件
    const activityEvents: UserActivityEvent[] = [
      "click",
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((event) => {
      if (event === "scroll") {
        window.addEventListener(event, throttledScroll, { passive: true });
      } else if (event === "mousemove") {
        document.addEventListener(event, throttledMouseMove, { passive: true });
      } else {
        document.addEventListener(event, debouncedActivity, { passive: true });
      }
    });

    // 心跳计时器 - 定期发送数据
    timers.current.heartbeatTimer = setInterval(() => {
      if (state.current.isVisible && trackerState.current.isTracking) {
        sendEngagementData(false);
      }
    }, finalConfig.heartbeatInterval);

    // 页面卸载事件处理
    const handleBeforeUnload = () => {
      if (state.current.isActive && state.current.isVisible) {
        const currentTime = Date.now();
        engagementData.current.activeTime +=
          currentTime - state.current.lastActiveTime;
      }
      sendEngagementData(true);
    };

    const handleUnload = () => {
      sendEngagementData(true);
    };

    const handlePageHide = () => {
      if (state.current.isActive && state.current.isVisible) {
        const currentTime = Date.now();
        engagementData.current.activeTime +=
          currentTime - state.current.lastActiveTime;
      }
      sendEngagementData(true);
    };

    // 注册卸载事件
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
    window.addEventListener("pagehide", handlePageHide);

    // 清理函数
    return () => {
      cleanupTracker();

      // 移除事件监听器
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleUserActivity);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
      window.removeEventListener("pagehide", handlePageHide);

      activityEvents.forEach((event) => {
        if (event === "scroll") {
          window.removeEventListener(event, throttledScroll);
        } else if (event === "mousemove") {
          document.removeEventListener(event, throttledMouseMove);
        } else {
          document.removeEventListener(event, debouncedActivity);
        }
      });
    };
  }, [
    initializeTracker,
    cleanupTracker,
    handleVisibilityChange,
    handleUserActivity,
    handleScroll,
    sendEngagementData,
    throttle,
    debounce,
    finalConfig.throttleDelay,
    finalConfig.debounceDelay,
    finalConfig.heartbeatInterval,
  ]);

  // 这个组件不渲染任何UI
  return null;
}
