export interface EngagementMetrics {
  totalTimeOnPage: number;
  activeTime: number;
  idleTime: number;
  visibilityChanges: number;
  scrollDepth: number;
  interactions: number;
  sessionStart: number;
  lastActivity: number;
}

export interface EngagementContext {
  url: string;
  userAgent: string;
  referrer: string;
  sessionId: string;
  clientIP?: string;
  timestamp?: string;
}

export interface EngagementData extends EngagementMetrics, EngagementContext {}

export interface TaskSession {
  task_id: string;
  id: number;
  participant_id: string;
  treatment_group: string;
  task_topic: string;
  task_type: string;
  task_start_time: string;
}

export interface EngagementEvent {
  type: "page_engagement";
  data: EngagementData;
  taskSession?: TaskSession | null;
  pageContext?: string;
}

export interface ProcessedEngagementMetrics {
  totalTimeOnPage: number;
  activeTime: number;
  idleTime: number;
  visibilityChanges: number;
  scrollDepth: number;
  interactions: number;
  engagementRate: number; // 参与度百分比 (activeTime / totalTimeOnPage * 100)
  avgTimePerInteraction: number; // 平均每次交互时间 (activeTime / interactions)
}

export interface EngagementSession {
  sessionStart: string; // ISO string
  lastActivity: string; // ISO string
  duration: number; // 毫秒
}

export interface AnalyticsData {
  timestamp: string;
  sessionId: string;
  url: string;
  referrer: string;
  userAgent: string;
  clientIP: string;
  metrics: ProcessedEngagementMetrics;
  session: EngagementSession;
  taskSession?: TaskSession | null;
  pageContext?: string;
}

export interface EngagementApiResponse {
  success: boolean;
  message: string;
  summary?: {
    taskId?: string;
    participantId?: string;
    sessionId: string;
    activeTimeSeconds: number;
    engagementRate: number;
    savedToDatabase: boolean;
  };
  error?: string;
}

// 页面状态追踪
export interface PageState {
  isVisible: boolean;
  isActive: boolean;
  lastActiveTime: number;
  lastVisibilityChange: number;
  maxScrollDepth: number;
  sessionId: string;
}

// 定时器引用
export interface TimerRefs {
  activityTimer: NodeJS.Timeout | null;
  heartbeatTimer: NodeJS.Timeout | null;
}

// 配置选项
export interface EngagementTrackerConfig {
  inactivityThreshold?: number; // 非活跃阈值（毫秒），默认30秒
  heartbeatInterval?: number; // 心跳间隔（毫秒），默认30秒
  throttleDelay?: number; // 滚动事件节流延迟（毫秒），默认100ms
  debounceDelay?: number; // 用户活动防抖延迟（毫秒），默认100ms
  apiEndpoint?: string; // API端点，默认'/api/analytics/engagement'
  enableConsoleLogging?: boolean; // 是否启用控制台日志
}

// 事件类型
export type UserActivityEvent =
  | "click"
  | "mousedown"
  | "mousemove"
  | "keypress"
  | "scroll"
  | "touchstart";

// 页面可见性状态
export type VisibilityState = "visible" | "hidden";

// 用户活动状态
export type ActivityState = "active" | "inactive";

// 页面上下文类型
export type PageContext = "search_results" | "ai_mode" | "other";

// 追踪状态
export interface TrackerState {
  isInitialized: boolean;
  isTracking: boolean;
  hasError: boolean;
  lastError?: Error;
}

// 数据库模型接口
export interface PageEngagementRecord {
  id: number;
  task_record_id: number;
  task_id: string;
  session_id: string;
  url: string;
  referrer?: string;
  user_agent: string;
  client_ip?: string;
  total_time_on_page: number;
  active_time: number;
  idle_time: number;
  visibility_changes: number;
  scroll_depth: number;
  interactions: number;
  engagement_rate: number;
  session_start: Date;
  last_activity: Date;
  page_context?: string;
  created_at: Date;
  updated_at: Date;
}
