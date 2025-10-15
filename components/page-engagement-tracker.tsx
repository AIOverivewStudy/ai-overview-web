"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { getCurrentTaskSession } from "@/lib/analytics";
import type { TaskSession } from "@/types/api";

interface EngagementMetrics {
  totalTimeOnTask: number;  // 当前页面访问的总时间
  activeTime: number;       // 当前页面访问的活跃时间
  idleTime: number;         // 当前页面访问的空闲时间
  visibilityChanges: number;
  maxScrollDepth: number;   // 当前页面访问的最大滚动深度
  interactions: number;
  sessionStart: number;     // 当前页面访问的开始时间
  lastActivity: number;
}

interface EngagementData extends EngagementMetrics {
  userAgent: string;
}

interface EngagementEvent {
  type: "page_engagement";
  data: EngagementData;
  participant_id: string;  // ✅ 只需要 RID
}

interface PageState {
  isVisible: boolean;
  isActive: boolean;
  lastActiveTime: number;
  lastVisibilityChange: number;
  maxScrollDepth: number;
}

interface TimerRefs {
  activityTimer: NodeJS.Timeout | null;
  heartbeatTimer: NodeJS.Timeout | null;
  firstHeartbeatTimer: NodeJS.Timeout | null;
}

interface RequestControl {
  abortController: AbortController | null;
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
  finalDataSent: boolean; // 防止重复发送最终数据
}

const DEFAULT_CONFIG: Required<EngagementTrackerConfig> = {
  inactivityThreshold: 5000,    // 5s 无活动视为空闲
  heartbeatInterval: 10000,     // 10s 发送一次心跳
  throttleDelay: 100,           // 节流延迟 100ms
  debounceDelay: 100,           // 防抖延迟 100ms
  apiEndpoint: "/api/analytics/engagement",
  enableConsoleLogging: true,   // 启用详细日志（生产环境可关闭）
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
    totalTimeOnTask: 0,
    activeTime: 0,
    idleTime: 0,
    visibilityChanges: 0,
    maxScrollDepth: 0,
    interactions: 0,
    sessionStart: Date.now(),
    lastActivity: Date.now(),
  });

  const timers = useRef<TimerRefs>({
    activityTimer: null,
    heartbeatTimer: null,
    firstHeartbeatTimer: null,
  });

  const requestControl = useRef<RequestControl>({
    abortController: null,
  });

  const state = useRef<PageState>({
    isVisible: true,
    isActive: true,
    lastActiveTime: Date.now(),
    lastVisibilityChange: Date.now(),
    maxScrollDepth: 0,
  });

  const trackerState = useRef<TrackerState>({
    isInitialized: false,
    isTracking: false,
    hasError: false,
    finalDataSent: false,
  });

  // 当前任务会话信息
  const taskSession = useRef<TaskSession | null>(null);

  // 🛠️ 工具函数：节流（Throttle）
  // 限制函数在指定时间内只能执行一次（用于高频事件如 scroll）
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

  // 🛠️ 工具函数：防抖（Debounce）
  // 延迟执行函数，如果在延迟期间再次调用，则重新计时（用于减少调用频率）
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
      
      // 🛡️ 防止重复发送最终数据
      if (finalData && trackerState.current.finalDataSent) {
        if (finalConfig.enableConsoleLogging) {
          console.log("⏭️ [Engagement] Final data already sent, skipping duplicate");
        }
        return;
      }

      // 🚫 如果是最终数据，先取消所有进行中的请求
      if (finalData && requestControl.current.abortController) {
        if (finalConfig.enableConsoleLogging) {
          console.log("🚫 [Engagement] Aborting in-flight requests for final data");
        }
        requestControl.current.abortController.abort();
        requestControl.current.abortController = null;
      }

      try {
        const currentTime = Date.now();
        const data = engagementData.current;
        const beforeActiveTime = data.activeTime; // 记录更新前的值

        // 📊 前端只计算【当前页面访问】的增量数据
        // 后端会负责累加到数据库中的总值
        data.totalTimeOnTask = currentTime - data.sessionStart;

        // ⏱️ ActiveTime 追踪逻辑：
        // - 只有在页面【可见】且【活跃】时才累积 activeTime
        // - lastActiveTime 记录上次累积的时间点，避免重复计算
        if (state.current.isVisible && state.current.isActive) {
          const additionalActiveTime = currentTime - state.current.lastActiveTime;
          data.activeTime += additionalActiveTime;
          state.current.lastActiveTime = currentTime;
          
          if (finalConfig.enableConsoleLogging) {
            console.log("⏱️ [ActiveTime Update]", {
              reason: finalData ? "final_data" : "heartbeat",
              additionalTime: Math.round(additionalActiveTime / 1000) + "s",
              beforeUpdate: Math.round(beforeActiveTime / 1000) + "s",
              afterUpdate: Math.round(data.activeTime / 1000) + "s",
              isVisible: state.current.isVisible,
              isActive: state.current.isActive,
            });
          }
        }

        // 🛡️ 防御性编程：确保 activeTime 不超过 totalTimeOnTask
        if (data.activeTime > data.totalTimeOnTask) {
          if (finalConfig.enableConsoleLogging) {
            console.warn("⚠️ [ActiveTime] activeTime exceeded totalTimeOnTask!", {
              activeTime: Math.round(data.activeTime / 1000) + "s",
              totalTimeOnTask: Math.round(data.totalTimeOnTask / 1000) + "s",
              difference: Math.round((data.activeTime - data.totalTimeOnTask) / 1000) + "s",
              correcting: "Capping activeTime to totalTimeOnTask",
            });
          }
          data.activeTime = data.totalTimeOnTask;
        }
        
        // 计算空闲时间 = 总时间 - 活跃时间
        data.idleTime = Math.max(0, data.totalTimeOnTask - data.activeTime);

        // 更新最大滚动深度
        data.maxScrollDepth = Math.max(
          data.maxScrollDepth,
          state.current.maxScrollDepth,
        );

        // 构建上报数据（简化版）
        const engagementDataFull: EngagementData = {
          ...data,
          userAgent: navigator.userAgent,
        };

        // 验证 taskSession 存在
        if (!taskSession.current || !taskSession.current.participant_id) {
          console.error("❌ [Engagement] No valid task session or participant_id available");
          return;
        }

        const payload: EngagementEvent = {
          type: "page_engagement",
          data: engagementDataFull,
          participant_id: taskSession.current.participant_id, // ✅ 只传 RID
        };

        const engagementRate = data.totalTimeOnTask > 0 
          ? (data.activeTime / data.totalTimeOnTask) * 100 
          : 0;

        if (finalConfig.enableConsoleLogging) {
          console.log("📊 [PageEngagement] " + (finalData ? "🔴 FINAL DATA" : "💓 Heartbeat"), {
            timestamp: new Date().toISOString(),
            participantId: taskSession.current.participant_id,
            taskId: taskSession.current.task_id,
            metrics: {
              totalTime: Math.round(data.totalTimeOnTask / 1000) + "s",
              activeTime: Math.round(data.activeTime / 1000) + "s",
              idleTime: Math.round(data.idleTime / 1000) + "s",
              engagementRate: Math.round(engagementRate * 100) / 100 + "%",
              maxScrollDepth: data.maxScrollDepth + "%",
              interactions: data.interactions,
              visibilityChanges: data.visibilityChanges,
            },
            state: {
              isVisible: state.current.isVisible,
              isActive: state.current.isActive,
            },
          });
        }

        // 使用 sendBeacon 确保数据能够发送，即使在页面卸载时
        if (navigator.sendBeacon && finalData) {
          // 标记最终数据已发送（在发送前标记，防止并发）
          trackerState.current.finalDataSent = true;
          
          // 创建带有正确 Content-Type 的 Blob
          const blob = new Blob([JSON.stringify(payload)], {
            type: "application/json",
          });
          const success = navigator.sendBeacon(
            finalConfig.apiEndpoint,
            blob,
          );
          if (!success && finalConfig.enableConsoleLogging) {
            console.warn(
              "[PageEngagementTracker] sendBeacon failed, data may be lost",
            );
          }
        } else {
          // 常规情况下使用 fetch
          // 🔄 为非最终数据创建 AbortController，这样可以在页面卸载时取消
          if (!finalData) {
            requestControl.current.abortController = new AbortController();
          }
          
          const response = await fetch(finalConfig.apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            keepalive: finalData, // 页面卸载时保持请求活跃
            signal: !finalData ? requestControl.current.abortController?.signal : undefined,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // 清除 AbortController（请求成功完成）
          if (!finalData) {
            requestControl.current.abortController = null;
          }
          
          // 标记最终数据已发送
          if (finalData) {
            trackerState.current.finalDataSent = true;
          }
        }
      } catch (error) {
        // 忽略 AbortError（这是预期的取消行为）
        if (error instanceof Error && error.name === 'AbortError') {
          if (finalConfig.enableConsoleLogging) {
            console.log("🚫 [Engagement] Request aborted (expected)");
          }
          return;
        }
        logError(error as Error, "Failed to send engagement data");
      }
    },
    [
      finalConfig.apiEndpoint,
      finalConfig.enableConsoleLogging,
      logError,
    ],
  );

  // 处理页面可见性变化
  const handleVisibilityChange = useCallback(() => {
    const currentTime = Date.now();
    const wasVisible = state.current.isVisible;
    const isNowVisible = !document.hidden;

    if (wasVisible && !isNowVisible) {
      // 页面变为不可见
      let activeTimeAdded = 0;
      if (state.current.isActive) {
        activeTimeAdded = currentTime - state.current.lastActiveTime;
        engagementData.current.activeTime += activeTimeAdded;
        state.current.lastActiveTime = currentTime; // 🔧 修复：更新 lastActiveTime 避免重复计算
      }
      state.current.isVisible = false;
      engagementData.current.visibilityChanges++;

      if (finalConfig.enableConsoleLogging) {
        console.log("👁️ [Visibility] Page became HIDDEN", {
          timestamp: new Date().toISOString(),
          wasActive: state.current.isActive,
          activeTimeAdded: Math.round(activeTimeAdded / 1000) + "s",
          totalActiveTime: Math.round(engagementData.current.activeTime / 1000) + "s",
          visibilityChanges: engagementData.current.visibilityChanges,
        });
      }
    } else if (!wasVisible && isNowVisible) {
      // 页面变为可见
      const hiddenDuration = currentTime - state.current.lastVisibilityChange;
      state.current.isVisible = true;
      state.current.lastActiveTime = currentTime;
      state.current.lastVisibilityChange = currentTime;
      engagementData.current.visibilityChanges++;

      if (finalConfig.enableConsoleLogging) {
        console.log("👁️ [Visibility] Page became VISIBLE", {
          timestamp: new Date().toISOString(),
          hiddenDuration: Math.round(hiddenDuration / 1000) + "s",
          visibilityChanges: engagementData.current.visibilityChanges,
        });
      }
    }
  }, [finalConfig.enableConsoleLogging]);

  // 处理用户活动
  const handleUserActivity = useCallback(() => {
    if (!trackerState.current.isTracking) return;

    const currentTime = Date.now();
    const wasActive = state.current.isActive;

    if (!state.current.isActive) {
      // 从非活跃状态恢复
      const inactiveDuration = currentTime - engagementData.current.lastActivity;
      state.current.isActive = true;
      state.current.lastActiveTime = currentTime;

      if (finalConfig.enableConsoleLogging) {
        console.log("🟢 [Activity] User became ACTIVE", {
          timestamp: new Date().toISOString(),
          inactiveDuration: Math.round(inactiveDuration / 1000) + "s",
          totalInteractions: engagementData.current.interactions + 1,
        });
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
        const activeTimeAdded = inactiveTime - state.current.lastActiveTime;
        engagementData.current.activeTime += activeTimeAdded;
        state.current.lastActiveTime = inactiveTime; // 🔧 修复：更新 lastActiveTime 避免重复计算
        
        if (finalConfig.enableConsoleLogging) {
          console.log("🔴 [Activity] User became INACTIVE", {
            timestamp: new Date().toISOString(),
            activeTimeAdded: Math.round(activeTimeAdded / 1000) + "s",
            totalActiveTime: Math.round(engagementData.current.activeTime / 1000) + "s",
            inactivityThreshold: finalConfig.inactivityThreshold / 1000 + "s",
          });
        }
      }
      state.current.isActive = false;
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

      const previousMaxDepth = state.current.maxScrollDepth;
      state.current.maxScrollDepth = Math.max(
        state.current.maxScrollDepth,
        scrollPercent,
      );
      
      // 只在滚动深度有显著变化时记录（每10%记录一次）
      if (finalConfig.enableConsoleLogging && 
          Math.floor(state.current.maxScrollDepth / 10) > Math.floor(previousMaxDepth / 10)) {
        console.log("📜 [Scroll] Depth increased", {
          timestamp: new Date().toISOString(),
          currentDepth: scrollPercent + "%",
          maxDepth: state.current.maxScrollDepth + "%",
          scrollTop: Math.round(scrollTop) + "px",
          docHeight: Math.round(docHeight) + "px",
        });
      }
      
      handleUserActivity();
    } catch (error) {
      logError(error as Error, "Error calculating scroll depth");
    }
  }, [handleUserActivity, logError, finalConfig.enableConsoleLogging]);

  // 初始化追踪器
  const initializeTracker = useCallback(async () => {
    if (trackerState.current.isInitialized) return;

    try {
      if (finalConfig.enableConsoleLogging) {
        console.log("🚀 [Init] PageEngagementTracker starting...", {
          timestamp: new Date().toISOString(),
          url: window.location.href,
        });
      }

      // 获取当前任务会话
      try {
        const currentTask = await getCurrentTaskSession();
        taskSession.current = currentTask;

        if (finalConfig.enableConsoleLogging) {
          console.log("✅ [Init] Task session loaded", {
            taskId: currentTask.task_id,
            participantId: currentTask.participant_id,
            treatmentGroup: currentTask.treatment_group,
            taskTopic: currentTask.task_topic,
            taskType: currentTask.task_type,
          });
        }
      } catch (taskError) {
        logError(taskError as Error, "Failed to load task session");
        if (finalConfig.enableConsoleLogging) {
          console.warn("⚠️ [Init] Continuing without task session");
        }
        // 继续初始化，但没有任务上下文
      }

      // 初始化状态
      const initTime = Date.now();
      state.current.lastActiveTime = initTime;
      state.current.isVisible = !document.hidden;
      engagementData.current.sessionStart = initTime;
      engagementData.current.lastActivity = initTime;
      trackerState.current.isInitialized = true;
      trackerState.current.isTracking = true;

      if (finalConfig.enableConsoleLogging) {
        console.log("✅ [Init] Tracker initialized successfully", {
          config: {
            inactivityThreshold: finalConfig.inactivityThreshold / 1000 + "s",
            heartbeatInterval: finalConfig.heartbeatInterval / 1000 + "s",
            throttleDelay: finalConfig.throttleDelay + "ms",
            enableLogging: finalConfig.enableConsoleLogging,
          },
          initialState: {
            isVisible: state.current.isVisible,
            isActive: state.current.isActive,
          },
        });
      }
    } catch (error) {
      logError(error as Error, "Failed to initialize tracker");
    }
  }, [finalConfig, logError]);

  // 清理追踪器
  const cleanupTracker = useCallback(() => {
    // 🛡️ 防止重复清理
    if (trackerState.current.finalDataSent) {
      if (finalConfig.enableConsoleLogging) {
        console.log("⏭️ [Cleanup] Already cleaned up, skipping");
      }
      return;
    }
    
    if (finalConfig.enableConsoleLogging) {
      console.log("🧹 [Cleanup] Starting cleanup...", {
        timestamp: new Date().toISOString(),
        wasTracking: trackerState.current.isTracking,
      });
    }

    // 🚫 第一步：立即停止追踪并清除所有定时器
    trackerState.current.isTracking = false;
    
    if (timers.current.activityTimer) {
      clearTimeout(timers.current.activityTimer);
      timers.current.activityTimer = null;
    }
    if (timers.current.heartbeatTimer) {
      clearInterval(timers.current.heartbeatTimer);
      timers.current.heartbeatTimer = null;
    }
    if (timers.current.firstHeartbeatTimer) {
      clearTimeout(timers.current.firstHeartbeatTimer);
      timers.current.firstHeartbeatTimer = null;
    }

    // 🚫 第二步：取消所有进行中的请求
    if (requestControl.current.abortController) {
      if (finalConfig.enableConsoleLogging) {
        console.log("🚫 [Cleanup] Aborting in-flight requests");
      }
      requestControl.current.abortController.abort();
      requestControl.current.abortController = null;
    }

    // ⏱️ 第三步：计算最终活跃时间
    if (state.current.isActive && state.current.isVisible) {
      const currentTime = Date.now();
      const finalActiveTime = currentTime - state.current.lastActiveTime;
      engagementData.current.activeTime += finalActiveTime;
      
      if (finalConfig.enableConsoleLogging) {
        console.log("⏱️ [Cleanup] Adding final active time", {
          finalActiveTime: Math.round(finalActiveTime / 1000) + "s",
          totalActiveTime: Math.round(engagementData.current.activeTime / 1000) + "s",
        });
      }
    }
    
    // 📤 第四步：发送最终数据（这会被标记，防止重复）
    if (finalConfig.enableConsoleLogging) {
      console.log("📤 [Cleanup] Sending final engagement data...");
    }
    sendEngagementData(true);

    if (finalConfig.enableConsoleLogging) {
      console.log("✅ [Cleanup] Tracker cleaned up successfully", {
        finalMetrics: {
          totalTime: Math.round(engagementData.current.totalTimeOnTask / 1000) + "s",
          activeTime: Math.round(engagementData.current.activeTime / 1000) + "s",
          interactions: engagementData.current.interactions,
          maxScrollDepth: state.current.maxScrollDepth + "%",
        },
      });
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
    // 延迟第一次发送，避免与旧页面的 cleanup 请求冲突
    timers.current.firstHeartbeatTimer = setTimeout(() => {
      if (state.current.isVisible && trackerState.current.isTracking) {
        sendEngagementData(false);
      }
    }, 2000); // 延迟 2 秒发送第一次
    
    timers.current.heartbeatTimer = setInterval(() => {
      if (state.current.isVisible && trackerState.current.isTracking) {
        sendEngagementData(false);
      }
    }, finalConfig.heartbeatInterval);

    // 🎯 页面卸载事件处理 - 只使用 pagehide（最可靠）
    // pagehide 在所有浏览器中都会触发，包括移动端的 bfcache 场景
    const handlePageHide = (event: PageTransitionEvent) => {
      if (finalConfig.enableConsoleLogging) {
        console.log("👋 [PageHide] Page is being hidden/unloaded", {
          persisted: event.persisted, // 是否进入 bfcache
        });
      }
      cleanupTracker();
    };

    // 注册卸载事件（只用一个）
    window.addEventListener("pagehide", handlePageHide);

    // 清理函数（React 组件卸载时调用）
    return () => {
      cleanupTracker();

      // 移除事件监听器
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleUserActivity);
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
    finalConfig.inactivityThreshold,
  ]);

  // 这个组件不渲染任何UI
  return null;
}
