// Analytics service for tracking link clicks and visit duration
import { saveTaskRecordWithRetry } from "@/lib/database-service";


// 统一使用types/api.ts中的类型定义
import type {
  TaskSession,
  ClickEvent,
  ShowMoreInteraction,
  ShowAllInteraction,
  ComponentName,
  InteractionComponentName,
  PageContext,
} from "@/types/api";





const extractUrlParams = () => {
  if (typeof window === "undefined") {
    return {
      topic: "",
      treatmentGroup: "",
      participant_id: "00001",
      originalTreatmentGroup: "",
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const from = searchParams.get("from");
  const basePath = from || window.location.pathname;
  const segments = basePath.split("/").filter(Boolean);

  // Extract RID from query parameters first, then sessionStorage
  // Priority: URL param > sessionStorage (tab-specific)
  let participant_id = searchParams.get("RID");
  
  if (!participant_id) {
    // Try sessionStorage first (tab-specific)
    participant_id = sessionStorage.getItem("RID");
  }
  
  if (!participant_id) {
    // No fallback to sessionStorage - maintain complete tab isolation
    participant_id = null;
  }
  
  if (!participant_id) {
    participant_id = "0";
  }

  // Store RID in sessionStorage only for complete tab isolation
  if (participant_id !== "0") {
    sessionStorage.setItem("RID", participant_id);  // Tab-specific storage
    // Note: Using only sessionStorage to ensure complete tab isolation
  }

  let topic = "";
  let treatmentGroup = "";
  let originalTreatmentGroup = "";

  // Special handling for iframe paths
  if (segments.length >= 2 && segments[0] === "iframe") {
    // For iframe paths like /iframe/CmuWebPageshmtl/product/Phone/P1/...
    // Extract the real topic from the embedded path
    if (segments.length >= 4 && (segments[1] === "CmuWebPageshmtl" || segments[1] === "AI-overviewHtml" || segments[1] === "AI-modeHtml")) {
      topic = segments[3]; // The real topic is at position 3
      treatmentGroup = `${segments[1]}_${segments[2]}`; // e.g., "CmuWebPageshmtl_product"
      originalTreatmentGroup = treatmentGroup;
      
      // Try to get the original treatment group from sessionStorage to maintain continuity
      const storedOriginalTreatmentGroup = sessionStorage.getItem("original_treatment_group");
      if (storedOriginalTreatmentGroup) {
        originalTreatmentGroup = storedOriginalTreatmentGroup;
      }
    } else {
      // Fallback for other iframe paths
      topic = segments[1] || "unknown";
      treatmentGroup = "iframe";
    }
  } else if (segments.length >= 2) {
    topic = segments[0];
    
    if (segments.length >= 4) {
      // 4段URL格式: /topic/mode/variant/page
      const mode = segments[1];
      const variant = segments[2];
      treatmentGroup = `${mode}_${variant}`;
      originalTreatmentGroup = treatmentGroup;
      
    } else if (segments.length === 2 && segments[1] === "ai-mode") {
      // 2段URL格式: /topic/ai-mode - 这可能是从搜索结果页面导航过来的
      treatmentGroup = "ai-mode";
      
      // 检查是否有from参数（来源页面），如果有则记录原始的treatment group
      if (from) {
        const fromSegments = from.split("/").filter(Boolean);
        if (fromSegments.length >= 4) {
          const fromMode = fromSegments[1];
          const fromVariant = fromSegments[2];
          originalTreatmentGroup = `${fromMode}_${fromVariant}`;
          // 保存原始页面路径，用于返回导航 (使用sessionStorage实现标签页隔离)
          sessionStorage.setItem("originalPathname", from);
        } else {
          originalTreatmentGroup = treatmentGroup;
        }
      } else {
        // 尝试从sessionStorage获取之前保存的原始treatment group (标签页隔离)
        const savedOriginalTreatmentGroup = sessionStorage.getItem("original_treatment_group");
        if (savedOriginalTreatmentGroup) {
          originalTreatmentGroup = savedOriginalTreatmentGroup;
        } else {
          originalTreatmentGroup = treatmentGroup;
        }
      }
      
    } else if (segments.length === 3) {
      // 3段URL格式: /topic/largeGroup/smallGroup (旧格式，兼容性)
      const largeGroup = segments[1];
      const smallGroup = segments[2];
      treatmentGroup = `${largeGroup}_${smallGroup}`;
      originalTreatmentGroup = treatmentGroup;
    }
  }

  return { topic, treatmentGroup, participant_id, originalTreatmentGroup };
};

// Determine task type based on topic
const getTaskType = (topic: string): "product" | "info" => {
  const productTopics = ["Laptop", "Phone", "Car-vehicle", "Cruise"];
  return productTopics.includes(topic) ? "product" : "info";
};

// Get current page context based on URL
const getCurrentPageContext = (): PageContext => {
  if (typeof window === "undefined") {
    return "search_results";
  }
  
  const pathname = window.location.pathname;
  
  // Check if we're in AI Mode
  if (pathname.endsWith("/ai-mode")) {
    return "ai_mode";
  }
  
  // Check if it's a normal search results page pattern
  // Pattern: /{topic}/{mode}/{variant}/{page}
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 4) {
    return "search_results";
  }
  
  // Default to search_results for other cases
  return "search_results";
};

// Save session to database with better error handling
const saveSessionToDatabase = async (
  session: TaskSession
): Promise<boolean> => {
  try {
    console.log("Saving session to database:", session);
    const success = await saveTaskRecordWithRetry(session);
    if (success) {
      console.log("Session successfully saved to database");
      return true;
    } else {
      console.error("Failed to save session to database after retries");
      return false;
    }
  } catch (error) {
    console.error("Failed to save session to database:", error);
    return false;
  }
};

// Get current UTC timestamp as Date object
const getCurrentUTCTimestamp = () => {
  return new Date();
};

// Helper function to revive Date objects from JSON
const reviveDates = (key: string, value: any): any => {
  if (typeof value === 'string' && (key.includes('time') || key === 'timestamp' || key === 'returnTimestamp')) {
    return new Date(value);
  }
  return value;
};

// Helper function to get participant-specific session key for sessionStorage
const getSessionKey = (): string => {
  const { participant_id } = extractUrlParams();
  return `current_task_session_${participant_id}`;
};

// Helper function to get participant-specific click tracking keys for sessionStorage
const getClickEventKey = (): string => {
  const { participant_id } = extractUrlParams();
  return `current_click_event_${participant_id}`;
};

const getClickStartTimeKey = (): string => {
  const { participant_id } = extractUrlParams();
  return `click_start_time_${participant_id}`;
};

// Helper function to safely parse session data from sessionStorage
const parseSessionFromStorage = (sessionRaw: string): TaskSession | null => {
  try {
    const parsed = JSON.parse(sessionRaw, reviveDates);
    // Ensure all timestamp fields are Date objects
    if (parsed.task_start_time && !(parsed.task_start_time instanceof Date)) {
      parsed.task_start_time = new Date(parsed.task_start_time);
    }
    if (parsed.click_sequence) {
      parsed.click_sequence.forEach((c: any) => {
        if (c.click_time && !(c.click_time instanceof Date)) {
          c.click_time = new Date(c.click_time);
        }
      });
    }
    if (parsed.show_more_interactions) {
      parsed.show_more_interactions.forEach((s: any) => {
        if (s.click_time && !(s.click_time instanceof Date)) {
          s.click_time = new Date(s.click_time);
        }
      });
    }
    if (parsed.show_all_interactions) {
      parsed.show_all_interactions.forEach((s: any) => {
        if (s.click_time && !(s.click_time instanceof Date)) {
          s.click_time = new Date(s.click_time);
        }
      });
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse session from storage:", error);
    return null;
  }
};

// 提取公共逻辑：获取下一个点击顺序
const getNextClickOrder = (session: TaskSession): number => {
  const lastClick = session.click_sequence.at(-1)?.click_order || 0;
  const lastShowMore = session.show_more_interactions.at(-1)?.click_order || 0;
  const lastShowAll = session.show_all_interactions.at(-1)?.click_order || 0;
  return Math.max(lastClick, lastShowMore, lastShowAll) + 1;
};

const createNewSession = async (): Promise<TaskSession> => {
  const { topic, treatmentGroup, participant_id, originalTreatmentGroup } = extractUrlParams();
  const taskType = getTaskType(topic);
  
  // Use original treatment group if available for task continuity
  const sessionTreatmentGroup = originalTreatmentGroup || treatmentGroup;
  
  // Create new session
  const newSession: TaskSession = {
    task_id: `${participant_id}_${topic}_${sessionTreatmentGroup}`,
    id: 0,
    participant_id: participant_id,
    treatment_group: sessionTreatmentGroup,
    task_topic: topic,
    task_type: taskType,
    task_start_time: getCurrentUTCTimestamp(),
    click_sequence: [],
    show_more_interactions: [],
    show_all_interactions: [],
    page_click_statics_1: 0,
    page_click_statics_2: 0,
    page_click_statics_3: 0,
    page_click_statics_4: 0,
  };

  console.log(`Creating new session for participant ${participant_id}:`, newSession);
  
  // Use participant-specific session key in sessionStorage
  const sessionKey = `current_task_session_${participant_id}`;
  sessionStorage.setItem(sessionKey, JSON.stringify(newSession));
  
  // Store the original treatment group for navigation (使用sessionStorage实现标签页隔离)
  if (originalTreatmentGroup) {
    sessionStorage.setItem("original_treatment_group", originalTreatmentGroup);
  }

  // Save to database asynchronously
  const result = await saveSessionToDatabase(newSession);
  console.log("新增完成", result);

  return newSession;
};

// Get current task session
const getCurrentTaskSession = async (): Promise<TaskSession> => {
  const { topic, treatmentGroup, originalTreatmentGroup, participant_id } = extractUrlParams();
  const taskType = getTaskType(topic);

  // Use participant-specific session key to isolate sessions by RID
  const sessionKey = `current_task_session_${participant_id}`;
  
  // Debug: Log current sessionStorage state for dwell time tracking
  const clickEventKey = getClickEventKey();
  const clickStartTimeKey = getClickStartTimeKey();
  const hasClickEvent = sessionStorage.getItem(clickEventKey) !== null;
  const hasClickStartTime = sessionStorage.getItem(clickStartTimeKey) !== null;
  console.log("🔍 getCurrentTaskSession debug:", {
    url: window.location.href,
    topic,
    treatmentGroup,
    participant_id,
    sessionKey,
    hasClickEvent,
    hasClickStartTime
  });
  
  // Try to get existing session (participant-specific) from sessionStorage
  const existingSession = sessionStorage.getItem(sessionKey);
  if (existingSession) {
    try {
      const session: TaskSession | null = parseSessionFromStorage(existingSession);
      if (!session) {
        throw new Error("Failed to parse session from storage");
      }
      console.log(session);

      // For task continuity, we should maintain the same task if:
      // 1. Same topic and task type
      // 2. Either same treatment group OR navigating to/from AI Mode within same variant
      // 3. OR navigating to iframe pages (for dwell time tracking continuity)
      const isIframeNavigation = treatmentGroup.includes("CmuWebPageshmtl") || 
                                treatmentGroup.includes("AI-overviewHtml") || 
                                treatmentGroup.includes("AI-modeHtml");
      
      const isSameTask = session.task_topic === topic && 
                        session.task_type === taskType && 
                        (session.treatment_group === treatmentGroup || 
                         session.treatment_group === originalTreatmentGroup ||
                         (treatmentGroup === "ai-mode" && originalTreatmentGroup && session.treatment_group === originalTreatmentGroup) ||
                         isIframeNavigation); // Allow iframe navigation to maintain session continuity

      if (!isSameTask) {
        console.log(
          "Session parameters changed, ending current session and creating new one"
        );
        console.log("🚨 IMPORTANT: About to end session - this might clear dwell time data!");
        console.log("Current sessionStorage state:", {
          hasClickEvent: sessionStorage.getItem(getClickEventKey()) !== null,
          hasClickStartTime: sessionStorage.getItem(getClickStartTimeKey()) !== null
        });
        endTaskSession();
        return await createNewSession();
      }
      
      // Store the original path for navigation purposes (使用sessionStorage实现标签页隔离)
      if (originalTreatmentGroup && originalTreatmentGroup !== treatmentGroup) {
        sessionStorage.setItem("original_treatment_group", originalTreatmentGroup);
      }
      
      return session;
    } catch (error) {
      console.error("Failed to parse existing session from sessionStorage, creating new session:", error);
      sessionStorage.removeItem(sessionKey);
      return await createNewSession();
    }
  } else {
    console.log(`No existing session found for participant ${participant_id}, creating new one`);
    return await createNewSession();
  }
};

// Store link click in sessionStorage
export const trackLinkClick = async (
  componentName: ComponentName,
  linkIndex: number,
  linkText: string
): Promise<string> => {
  console.log("Tracking link click");

  const session = await getCurrentTaskSession();
  console.log("session", session);

  const clickTime = getCurrentUTCTimestamp();

  // Determine page_id and other properties based on component
  let pageId = "";
  const positionInSerp = componentName + "_" + linkIndex;
  let fromOverview = false;
  let fromAiMode = false;

  if (componentName.includes("AiOverview-References")) {
    fromOverview = true;
  } else if (componentName.includes("AIMode")) {
    fromAiMode = true;
  }

  // Map component names to page IDs and properties
  if (componentName.startsWith("SearchResults_")) {
    pageId = `organic_${linkIndex + 1}`;
  } else if (componentName.startsWith("SearchResults-Sitelinks_")) {
    pageId = `sitelink_${linkIndex + 1}`;
  } else {
    switch (componentName) {
      case "SearchResults":
        pageId = `organic_${linkIndex + 1}`;
        break;
      case "SearchResults-Sitelinks":
        pageId = `sitelink_${linkIndex + 1}`;
        break;
      case "AiOverview":
      case "AiOverview-References":
        pageId = `overview_ref_${linkIndex + 1}`;
        fromOverview = true;
        break;
      case "AiMode-Sidebar":
      case "AIMode":
        pageId = `ai_mode_ref_${linkIndex + 1}`;
        fromAiMode = true;
        break;
      case "SearchTabs":
        pageId = `tab_${linkIndex + 1}`;
        break;
      case "PeopleAlsoSearch":
        pageId = `related_${linkIndex + 1}`;
        break;
      case "Video":
        pageId = `video_${linkIndex + 1}`;
        break;
      case "DiscussionsForums":
      case "DiscussionsAndForums":
        pageId = `discussion_${linkIndex + 1}`;
        break;
      case "clickPagination_":
        pageId = `pagination_${linkIndex + 1}`;
        break;
      case "ReferenceLink":
        pageId = `reference_link_${linkIndex + 1}`;
        break;
      default:
        pageId = `other_${linkIndex + 1}`;
    }
  }

  const clickEvent: ClickEvent = {
    task_id: session.task_id,
    click_order: getNextClickOrder(session),
    page_title: linkText,
    page_id: pageId,
    position_in_serp: positionInSerp,
    click_time: clickTime,
    dwell_time_sec: null, // Will be updated when user returns
    from_overview: fromOverview,
    from_ai_mode: fromAiMode,
    page_context: getCurrentPageContext(), // 添加页面上下文
  };

  // // Add click to session
  // session.click_sequence.push(clickEvent)

  const clickEventKey = getClickEventKey();
  sessionStorage.setItem(clickEventKey, JSON.stringify(clickEvent));
  console.log("💾 Click event saved to sessionStorage:", clickEvent.page_id);
  console.log("💾 Full click event:", clickEvent);

  if (componentName.includes("SearchResults")) {
    const pageNum = getPageNumber(componentName);
    if (pageNum === 1) {
      session.page_click_statics_1++;
    } else if (pageNum === 2) {
      session.page_click_statics_2++;
    } else if (pageNum === 3) {
      session.page_click_statics_3++;
    } else {
      session.page_click_statics_4++;
    }
  }

  console.log("当前session.click_sequence:", session);

  const sessionKey = getSessionKey();
  sessionStorage.setItem(sessionKey, JSON.stringify(session));

  console.log(`Tracked click: ${pageId} - "${linkText}", updating database...`);

  // Add click event to session
  session.click_sequence.push(clickEvent);

  // Save updated session to database and wait for completion
  const result = await saveSessionToDatabase(session);
  console.log("保存结果", result);

  // Store click info for dwell time calculation
  const clickId = `${session.participant_id}_${session.task_topic}_${session.treatment_group}_${clickEvent.click_order}`;
  const clickStartTimeKey = getClickStartTimeKey();
  sessionStorage.setItem(clickStartTimeKey, Date.now().toString());
  console.log("⏰ Click timer started at:", new Date().toISOString());
  console.log("⏰ Stored values in sessionStorage:", {
    click_event_key: clickEventKey,
    click_start_time_key: clickStartTimeKey,
    current_click_event: !!sessionStorage.getItem(clickEventKey),
    click_start_time: sessionStorage.getItem(clickStartTimeKey)
  });

  return clickId;
};

const getPageNumber = (input: string): number | null => {
  const match = input.match(/SearchResults(?:-Sitelinks)?_(\d+)/);
  return match ? Number(match[1]) : null;
};

export const trackShowMoreClick = async (
  componentName: InteractionComponentName
): Promise<void> => {
  const currSession = await getCurrentTaskSession();
  const clickTime = getCurrentUTCTimestamp();
  const nextOrder = getNextClickOrder(currSession);
  console.log("trackButtonClick", currSession);

  const showMoreInteraction: ShowMoreInteraction = {
    task_id: currSession.task_id,
    click_order: nextOrder,
    click_time: clickTime,
    component_name: componentName,
    page_context: getCurrentPageContext(), // 添加页面上下文
  };

  currSession.show_more_interactions.push(showMoreInteraction);

  // Add button interaction to session
  const sessionKey = getSessionKey();
  sessionStorage.setItem(sessionKey, JSON.stringify(currSession));

  console.log("Tracked button click, updating database...");
  saveSessionToDatabase(currSession);
};

export const trackShowAllClick = async (
  componentName: InteractionComponentName
): Promise<void> => {
  const currSession = await getCurrentTaskSession();
  const clickTime = getCurrentUTCTimestamp();
  const nextOrder = getNextClickOrder(currSession);
  console.log("trackButtonClick", currSession);

  const showAllInteraction: ShowAllInteraction = {
    task_id: currSession.task_id,
    click_order: nextOrder,
    click_time: clickTime,
    component_name: componentName,
    page_context: getCurrentPageContext(), // 添加页面上下文
  };

  currSession.show_all_interactions.push(showAllInteraction);

  // Add button interaction to session
  const sessionKey = getSessionKey();
  sessionStorage.setItem(sessionKey, JSON.stringify(currSession));

  console.log("Tracked button click, updating database...");
  saveSessionToDatabase(currSession);
};

// Track reference link (LinkIcon) clicks
export const trackReferenceLinkClick = async (
  referenceIndexes: number[], 
  componentName: string = "AiOverview"
): Promise<void> => {
  try {
    // Track as a link click with reference info
    await trackLinkClick(
      "ReferenceLink" as ComponentName, 
      referenceIndexes[0] || 0, 
      `Reference links: ${referenceIndexes.join(", ")} from ${componentName}`
    );
    console.log(`Tracked reference link click: indexes ${referenceIndexes.join(", ")} from ${componentName}`);
  } catch (error) {
    console.error("Failed to track reference link click:", error);
  }
};

let isTracking = false; // in-memory flag to prevent duplicate processing

export const trackReturnFromLink = async (caller?: string): Promise<void> => {
  // 获取调用堆栈信息
  const stack = new Error().stack;
  const callerInfo = stack?.split('\n')[2]?.trim() || 'unknown';
  const timestamp = new Date().toISOString();
  
  console.log("🔍 trackReturnFromLink called");
  console.log("📍 Called from:", caller || 'not specified');
  console.log("📍 Stack trace:", callerInfo);
  console.log("⏰ Timestamp:", timestamp);
  console.log("🌐 Current URL:", window.location.href);
  console.log("📄 Document visibility:", document.visibilityState);
  console.log("🎯 Window focused:", document.hasFocus());
  
  if (isTracking) {
    console.log("⏳ Already tracking, skipping...");
    console.log("🚫 Tracking blocked by:", caller || 'not specified');
    return;
  }
  
  const clickEventKey = getClickEventKey();
  const clickEventRaw = sessionStorage.getItem(clickEventKey);
  console.log("💾 current_click_event in sessionStorage:", clickEventRaw ? "EXISTS" : "NOT FOUND");
  
  if (!clickEventRaw) {
    console.log("❌ No click event found, user did not come from a tracked link");
    console.log("❌ Check details:", {
      caller: caller || 'not specified',
      clickEventKey,
      sessionStorageKeys: Object.keys(sessionStorage),
      hasAnyClickEvent: Object.keys(sessionStorage).some(key => key.includes('click_event'))
    });
    return;
  }

  console.log("✅ User returned from a tracked link, processing dwell time...");
  console.log("✅ Dwell time processing triggered by:", caller || 'not specified');
  isTracking = true; // lock

  try {
    let clickEvent: ClickEvent;
    try {
      const parsed = JSON.parse(clickEventRaw, reviveDates);
      // Ensure click_time is a Date object
      if (parsed.click_time && !(parsed.click_time instanceof Date)) {
        parsed.click_time = new Date(parsed.click_time);
      }
      clickEvent = parsed;
    } catch (parseError) {
      console.error("Failed to parse click event from sessionStorage:", parseError);
      sessionStorage.removeItem(clickEventKey);
      sessionStorage.removeItem(getClickStartTimeKey());
      return;
    }

    const clickStartTimeKey = getClickStartTimeKey();
    const startTime = sessionStorage.getItem(clickStartTimeKey);
    
    console.log("📊 Click event data:", {
      clickEvent: clickEvent,
      startTime: startTime ? new Date(Number(startTime)).toLocaleTimeString() : "NOT FOUND"
    });

    sessionStorage.removeItem(clickEventKey);
    sessionStorage.removeItem(clickStartTimeKey);
    console.log("🗑️ Cleared sessionStorage: click event and start time keys");

    if (!clickEvent || !startTime) {
      console.log("❌ Missing click event or start time, aborting...");
      return;
    }

    const dwellTimeMs = Date.now() - Number.parseInt(startTime);
    const dwellTimeSec = Math.round((dwellTimeMs / 1000) * 10) / 10;
    clickEvent.dwell_time_sec = dwellTimeSec;
    
    console.log("⏱️ Calculated dwell time:", {
      dwellTimeMs: dwellTimeMs,
      dwellTimeSec: dwellTimeSec,
      startTime: new Date(Number(startTime)).toLocaleTimeString(),
      endTime: new Date().toLocaleTimeString(),
      triggeredBy: caller || 'not specified',
      clickEventPageId: clickEvent.page_id,
      clickEventTaskId: clickEvent.task_id
    });

    const session = await getCurrentTaskSession();

    console.log("🔍 Checking for duplicate click events...");
    
    // 使用click_time和page_id组合来检查重复
    // Convert dates to ISO strings for comparison since JSON parse/stringify converts Date to string
    const clickTimeString = clickEvent.click_time instanceof Date ? clickEvent.click_time.toISOString() : new Date(clickEvent.click_time).toISOString();
    if (
      session.click_sequence.some(
        (c) => {
          const existingClickTimeString = c.click_time instanceof Date ? c.click_time.toISOString() : new Date(c.click_time).toISOString();
          return existingClickTimeString === clickTimeString && c.page_id === clickEvent.page_id;
        }
      )
    ) {
      console.log("🚫 Duplicate click event detected, skipping...");
      return;
    }

    session.click_sequence.push(clickEvent);
    const sessionKey = getSessionKey();
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    console.log(`✅ Dwell time recorded: ${dwellTimeSec}s, updating database...`);
    console.log("💾 Database update details:", {
      sessionTaskId: session.task_id,
      participantId: session.participant_id,
      clickSequenceLength: session.click_sequence.length,
      lastClickPageId: session.click_sequence[session.click_sequence.length - 1]?.page_id,
      triggeredBy: caller || 'not specified'
    });
    await saveSessionToDatabase(session);
    console.log("💾 Database updated successfully");
  } finally {
    isTracking = false; // unlock
  }
};

export const endTaskSession = (): void => {
  const sessionKey = getSessionKey();
  const sessionRaw = sessionStorage.getItem(sessionKey);
  if (!sessionRaw) return;

  let taskId = "unknown";
  try {
    const session: TaskSession | null = parseSessionFromStorage(sessionRaw);
    if (!session) {
      throw new Error("Failed to parse session from storage");
    }
    taskId = `${session.participant_id}_${session.task_topic}_${session.treatment_group}`;
    saveSessionToDatabase(session);
  } catch (error) {
    console.error("Failed to parse session when ending task session:", error);
  }

  sessionStorage.removeItem(sessionKey);

  console.log(`Task ${taskId} ended, saving final state to database...`);
};



// Initialize session tracking
let isInitialized = false;
export const initializeSession = (): void => {
  if (isInitialized) {
    console.log("Session already initialized, skipping...");
    return;
  }
  
  // This will create a new session if none exists
  console.log("Initializing session...");
  isInitialized = true;

  getCurrentTaskSession();
  console.log("Init end!!!-----Current session:");
};
