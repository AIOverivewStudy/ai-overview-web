// Analytics service for tracking link clicks and visit duration
import { saveTaskRecordWithRetry } from "@/lib/database-service";

// 统一使用types/api.ts中的类型定义
import type {
  TaskSession,
  ClickEvent,
  ShowAllContentClick,
  ShowAllReferencesClick,
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
    sessionStorage.setItem("RID", participant_id); // Tab-specific storage
    // Note: Using only sessionStorage to ensure complete tab isolation
  }

  let topic = "";
  let treatmentGroup = "";
  let originalTreatmentGroup = "";

  // Special handling for iframe paths
  if (segments.length >= 2 && segments[0] === "iframe") {
    // For iframe paths like /iframe/CmuWebPageshmtl/product/Phone/P1/...
    // Extract the real topic from the embedded path
    if (
      segments.length >= 4 &&
      (segments[1] === "CmuWebPageshmtl" ||
        segments[1] === "AI-overviewHtml" ||
        segments[1] === "AI-modeHtml")
    ) {
      topic = segments[3]; // The real topic is at position 3
      treatmentGroup = `${segments[1]}_${segments[2]}`; // e.g., "CmuWebPageshmtl_product"
      originalTreatmentGroup = treatmentGroup;

      // Try to get the original treatment group from sessionStorage to maintain continuity
      const storedOriginalTreatmentGroup = sessionStorage.getItem(
        "original_treatment_group",
      );
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
        const savedOriginalTreatmentGroup = sessionStorage.getItem(
          "original_treatment_group",
        );
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
  session: TaskSession,
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
const reviveDates = (key: string, value: unknown): unknown => {
  if (
    typeof value === "string" &&
    (key.includes("time") || key === "timestamp" || key === "returnTimestamp")
  ) {
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
const getClickEventStackKey = (): string => {
  const { participant_id } = extractUrlParams();
  return `click_event_stack_${participant_id}`;
};

const getClickStartTimeStackKey = (): string => {
  const { participant_id } = extractUrlParams();
  return `click_start_time_stack_${participant_id}`;
};

// Helper functions for managing click event stack
const pushClickEventToStack = (
  clickEvent: ClickEvent,
  startTime: string,
): void => {
  const eventStackKey = getClickEventStackKey();
  const timeStackKey = getClickStartTimeStackKey();

  // Get existing stacks or create new ones
  const eventStack: ClickEvent[] = JSON.parse(
    sessionStorage.getItem(eventStackKey) || "[]",
    reviveDates,
  );
  const timeStack: string[] = JSON.parse(
    sessionStorage.getItem(timeStackKey) || "[]",
  );

  // Push new items
  eventStack.push(clickEvent);
  timeStack.push(startTime);

  // Store back to sessionStorage
  sessionStorage.setItem(eventStackKey, JSON.stringify(eventStack));
  sessionStorage.setItem(timeStackKey, JSON.stringify(timeStack));

  console.log("📚 Pushed click event to stack:", {
    stackSize: eventStack.length,
    pageId: clickEvent.page_id,
  });
};

const popClickEventFromStack = (): {
  clickEvent: ClickEvent;
  startTime: string;
} | null => {
  const eventStackKey = getClickEventStackKey();
  const timeStackKey = getClickStartTimeStackKey();

  // Get existing stacks
  const eventStack: ClickEvent[] = JSON.parse(
    sessionStorage.getItem(eventStackKey) || "[]",
    reviveDates,
  );
  const timeStack: string[] = JSON.parse(
    sessionStorage.getItem(timeStackKey) || "[]",
  );

  if (eventStack.length === 0 || timeStack.length === 0) {
    return null;
  }

  // Pop items
  const clickEvent = eventStack.pop();
  const startTime = timeStack.pop();

  if (!clickEvent || !startTime) {
    return null;
  }

  // Store back to sessionStorage
  sessionStorage.setItem(eventStackKey, JSON.stringify(eventStack));
  sessionStorage.setItem(timeStackKey, JSON.stringify(timeStack));

  console.log("📚 Popped click event from stack:", {
    remainingStackSize: eventStack.length,
    pageId: clickEvent.page_id,
  });

  return { clickEvent, startTime };
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
      parsed.click_sequence.forEach(
        (c: { click_time?: string | number | Date }) => {
          if (c.click_time && !(c.click_time instanceof Date)) {
            c.click_time = new Date(c.click_time);
          }
        },
      );
    }
    if (parsed.show_all_content_clicks) {
      parsed.show_all_content_clicks.forEach(
        (s: { click_time?: string | number | Date }) => {
          if (s.click_time && !(s.click_time instanceof Date)) {
            s.click_time = new Date(s.click_time);
          }
        },
      );
    }
    if (parsed.show_all_references_clicks) {
      parsed.show_all_references_clicks.forEach(
        (s: { click_time?: string | number | Date }) => {
          if (s.click_time && !(s.click_time instanceof Date)) {
            s.click_time = new Date(s.click_time);
          }
        },
      );
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
  const lastShowAllContent =
    session.show_all_content_clicks.at(-1)?.click_order || 0;
  const lastShowAllReferences =
    session.show_all_references_clicks.at(-1)?.click_order || 0;
  return Math.max(lastClick, lastShowAllContent, lastShowAllReferences) + 1;
};

const createNewSession = async (): Promise<TaskSession> => {
  const { topic, treatmentGroup, participant_id, originalTreatmentGroup } =
    extractUrlParams();
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
    show_all_content_clicks: [],
    show_all_references_clicks: [],
    page_click_statics_1: 0,
    page_click_statics_2: 0,
    page_click_statics_3: 0,
    page_click_statics_4: 0,
  };

  console.log(
    `Creating new session for participant ${participant_id}:`,
    newSession,
  );

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
export const getCurrentTaskSession = async (): Promise<TaskSession> => {
  const { topic, treatmentGroup, originalTreatmentGroup, participant_id } =
    extractUrlParams();
  const taskType = getTaskType(topic);

  // Use participant-specific session key to isolate sessions by RID
  const sessionKey = `current_task_session_${participant_id}`;

  // Debug: Log current sessionStorage state for dwell time tracking
  const clickEventStackKey = getClickEventStackKey();
  const clickStartTimeStackKey = getClickStartTimeStackKey();
  const hasClickEvent = sessionStorage.getItem(clickEventStackKey) !== null;
  const hasClickStartTime =
    sessionStorage.getItem(clickStartTimeStackKey) !== null;
  console.log("🔍 getCurrentTaskSession debug:", {
    url: window.location.href,
    topic,
    treatmentGroup,
    participant_id,
    sessionKey,
    hasClickEvent,
    hasClickStartTime,
  });

  // Try to get existing session (participant-specific) from sessionStorage
  const existingSession = sessionStorage.getItem(sessionKey);
  if (existingSession) {
    try {
      const session: TaskSession | null =
        parseSessionFromStorage(existingSession);
      if (!session) {
        throw new Error("Failed to parse session from storage");
      }
      console.log(session);

      // For task continuity, we should maintain the same task if:
      // 1. Same topic and task type
      // 2. Either same treatment group OR navigating to/from AI Mode within same variant
      // 3. OR navigating to iframe pages (for dwell time tracking continuity)
      const isIframeNavigation =
        treatmentGroup.includes("CmuWebPageshmtl") ||
        treatmentGroup.includes("AI-overviewHtml") ||
        treatmentGroup.includes("AI-modeHtml");

      const isSameTask =
        session.task_topic === topic &&
        session.task_type === taskType &&
        (session.treatment_group === treatmentGroup ||
          session.treatment_group === originalTreatmentGroup ||
          (treatmentGroup === "ai-mode" &&
            originalTreatmentGroup &&
            session.treatment_group === originalTreatmentGroup) ||
          isIframeNavigation); // Allow iframe navigation to maintain session continuity

      if (!isSameTask) {
        console.log(
          "Session parameters changed, ending current session and creating new one",
        );
        console.log(
          "🚨 IMPORTANT: About to end session - this might clear dwell time data!",
        );
        console.log("Current sessionStorage state:", {
          hasClickEventStack:
            sessionStorage.getItem(getClickEventStackKey()) !== null,
          hasClickStartTimeStack:
            sessionStorage.getItem(getClickStartTimeStackKey()) !== null,
        });
        endTaskSession();
        return await createNewSession();
      }

      // Store the original path for navigation purposes (使用sessionStorage实现标签页隔离)
      if (originalTreatmentGroup && originalTreatmentGroup !== treatmentGroup) {
        sessionStorage.setItem(
          "original_treatment_group",
          originalTreatmentGroup,
        );
      }

      return session;
    } catch (error) {
      console.error(
        "Failed to parse existing session from sessionStorage, creating new session:",
        error,
      );
      sessionStorage.removeItem(sessionKey);
      return await createNewSession();
    }
  } else {
    console.log(
      `No existing session found for participant ${participant_id}, creating new one`,
    );
    return await createNewSession();
  }
};

// Store link click in sessionStorage
export const trackLinkClick = async (
  componentName: ComponentName | "clickPagination_",
  linkIndex: number | string,
  linkText: string,
  sponsored?: boolean,
): Promise<string> => {
  console.log("🔗 [LinkClick] Tracking link click", {
    timestamp: new Date().toISOString(),
    componentName,
    linkIndex,
    linkText: linkText.substring(0, 50) + (linkText.length > 50 ? "..." : ""),
    sponsored: sponsored || false,
  });

  const session = await getCurrentTaskSession();
  console.log("📋 [LinkClick] Current session", {
    taskId: session.task_id,
    participantId: session.participant_id,
    clickSequenceLength: session.click_sequence.length,
    treatmentGroup: session.treatment_group,
  });

  const clickTime = getCurrentUTCTimestamp();

  // Determine page_id and other properties based on component
  let pageId = "";
  let fromOverview = false;
  let fromAiMode = false;

  if (componentName.includes("AiOverview-References")) {
    fromOverview = true;
  } else if (componentName.includes("AIMode")) {
    fromAiMode = true;
  }

  // Convert linkIndex to string format
  // For string format like "0_1" or "3_2", keep as is
  // For number format, add 1 (for non-reference components)
  let linkIndexStr: string;
  if (typeof linkIndex === "number") {
    linkIndexStr = `${linkIndex + 1}`;
  } else {
    linkIndexStr = linkIndex;
  }
  
  const positionInSerp = componentName + "_" + linkIndexStr;

  // Map component names to page IDs and properties
  if (componentName.startsWith("SearchResults_")) {
    pageId = `organic_${linkIndexStr}`;
  } else if (componentName.startsWith("SearchResults-Sitelinks_")) {
    pageId = `sitelink_${linkIndexStr}`;
  } else {
    switch (componentName) {
      case "SearchResults":
        pageId = `organic_${linkIndexStr}`;
        break;
      case "SearchResults-Sitelinks":
        pageId = `sitelink_${linkIndexStr}`;
        break;
      case "AiOverview":
      case "AiOverview-References":
        pageId = `overview_ref_${linkIndexStr}`;
        fromOverview = true;
        break;
      case "AiMode-Sidebar":
      case "AIMode":
        pageId = `ai_mode_ref_${linkIndexStr}`;
        fromAiMode = true;
        break;
      case "SearchTabs":
        pageId = `tab_${linkIndexStr}`;
        break;
      case "PeopleAlsoSearch":
        pageId = `related_${linkIndexStr}`;
        break;
      case "Video":
        pageId = `video_${linkIndexStr}`;
        break;
      case "DiscussionsForums":
      case "DiscussionsAndForums":
        pageId = `discussion_${linkIndexStr}`;
        break;
      case "clickPagination_":
        pageId = `pagination_${linkIndexStr}`;
        break;
      case "ReferenceLink":
        pageId = `reference_link_${linkIndexStr}`;
        break;
      default:
        pageId = `other_${linkIndexStr}`;
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
    sponsored: sponsored || false,
    page_context: getCurrentPageContext(), // 添加页面上下文
  };

  // // Add click to session
  // session.click_sequence.push(clickEvent)

  // Store click event in sessionStorage stack for dwell time tracking
  const startTimeString = Date.now().toString();
  pushClickEventToStack(clickEvent, startTimeString);
  console.log("💾 [DwellTime] Click event pushed to stack", {
    pageId: clickEvent.page_id,
    pageTitle: clickEvent.page_title,
    clickOrder: clickEvent.click_order,
    positionInSerp: clickEvent.position_in_serp,
    startTime: new Date(Number(startTimeString)).toISOString(),
    fromOverview: clickEvent.from_overview,
    fromAiMode: clickEvent.from_ai_mode,
    pageContext: clickEvent.page_context,
  });

  console.log("📊 [Session] Current click sequence", {
    totalClicks: session.click_sequence.length,
    pageClickStats: {
      page1: session.page_click_statics_1,
      page2: session.page_click_statics_2,
      page3: session.page_click_statics_3,
      page4: session.page_click_statics_4,
    },
  });

  // Update page click statistics
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

  console.log(`✅ [LinkClick] Click tracked: ${pageId} - "${linkText.substring(0, 30)}..."`);

  // Add click event to session (without dwell time initially)
  session.click_sequence.push(clickEvent);

  // Update sessionStorage with the new click event
  const sessionKey = getSessionKey();
  sessionStorage.setItem(sessionKey, JSON.stringify(session));

  // Save updated session to database and wait for completion
  console.log("💾 [Database] Saving session to database...");
  const result = await saveSessionToDatabase(session);
  console.log("💾 [Database] Save result:", result ? "✅ SUCCESS" : "❌ FAILED");

  // Click info is already stored in the stack above
  const clickId = `${session.participant_id}_${session.task_topic}_${session.treatment_group}_${clickEvent.click_order}`;
  console.log("⏰ [DwellTime] Timer started", {
    clickId,
    startTime: new Date().toISOString(),
    pageId: clickEvent.page_id,
  });

  return clickId;
};

const getPageNumber = (input: string): number | null => {
  const match = input.match(/SearchResults(?:-Sitelinks)?_(\d+)/);
  return match ? Number(match[1]) : null;
};

export const trackShowAllContentClick = async (
  componentName: InteractionComponentName,
): Promise<void> => {
  const currSession = await getCurrentTaskSession();
  const clickTime = getCurrentUTCTimestamp();
  const nextOrder = getNextClickOrder(currSession);
  console.log("trackShowAllContentClick", currSession);

  const showAllContentClick: ShowAllContentClick = {
    task_id: currSession.task_id,
    click_order: nextOrder,
    click_time: clickTime,
    component_name: componentName,
    page_context: getCurrentPageContext(), // 添加页面上下文
  };

  currSession.show_all_content_clicks.push(showAllContentClick);

  // Add button interaction to session
  const sessionKey = getSessionKey();
  sessionStorage.setItem(sessionKey, JSON.stringify(currSession));

  console.log("Tracked show all content click, updating database...");
  saveSessionToDatabase(currSession);
};

export const trackShowAllReferencesClick = async (
  componentName: InteractionComponentName,
): Promise<void> => {
  const currSession = await getCurrentTaskSession();
  const clickTime = getCurrentUTCTimestamp();
  const nextOrder = getNextClickOrder(currSession);
  console.log("trackShowAllReferencesClick", currSession);

  const showAllReferencesClick: ShowAllReferencesClick = {
    task_id: currSession.task_id,
    click_order: nextOrder,
    click_time: clickTime,
    component_name: componentName,
    page_context: getCurrentPageContext(), // 添加页面上下文
    // 为一般的 show all references 点击提供默认值
    filter_reference_indexes: [], // 默认空数组
    global_reference_index: undefined,
    text_block_content: undefined,
    filtered_references_count: undefined,
  };

  currSession.show_all_references_clicks.push(showAllReferencesClick);

  // Add button interaction to session
  const sessionKey = getSessionKey();
  sessionStorage.setItem(sessionKey, JSON.stringify(currSession));

  console.log("Tracked show all references click, updating database...");
  saveSessionToDatabase(currSession);
};

// Track filter references button clicks (LinkIcon clicks)
export const trackFilterReferencesClick = async (
  referenceIndexes: number[],
  componentName: string = "AiOverview",
  globalReferenceIndex?: number,
  textBlockContent?: string,
): Promise<void> => {
  try {
    const currSession = await getCurrentTaskSession();
    const clickTime = getCurrentUTCTimestamp();
    const nextOrder = getNextClickOrder(currSession);

    const filterReferencesClick: ShowAllReferencesClick = {
      task_id: currSession.task_id,
      click_order: nextOrder,
      click_time: clickTime,
      component_name:
        `${componentName}_FilterReferences` as InteractionComponentName,
      page_context: getCurrentPageContext(),
      // 添加筛选引用的详细信息
      filter_reference_indexes: referenceIndexes || [], // 确保总是提供数组
      global_reference_index: globalReferenceIndex,
      text_block_content: textBlockContent
        ? textBlockContent.substring(0, 100)
        : undefined, // 截取前100字符作为摘要
      filtered_references_count: referenceIndexes ? referenceIndexes.length : 0,
    };

    currSession.show_all_references_clicks.push(filterReferencesClick);

    // Update sessionStorage
    const sessionKey = getSessionKey();
    sessionStorage.setItem(sessionKey, JSON.stringify(currSession));

    console.log(`Tracked filter references click:`, {
      indexes: referenceIndexes.join(", "),
      componentName,
      globalReferenceIndex,
      referencesCount: referenceIndexes.length,
      textBlockSummary: textBlockContent
        ? textBlockContent.substring(0, 50) + "..."
        : "N/A",
    });

    // Save to database
    await saveSessionToDatabase(currSession);
  } catch (error) {
    console.error("Failed to track filter references click:", error);
  }
};

// Track reference link (LinkIcon) clicks - DEPRECATED: Use trackFilterReferencesClick instead
export const trackReferenceLinkClick = async (
  referenceIndexes: number[],
  componentName: string = "AiOverview",
  globalReferenceIndex?: number,
  textBlockContent?: string,
): Promise<void> => {
  // Redirect to the new function for backward compatibility
  console.warn(
    "trackReferenceLinkClick is deprecated, use trackFilterReferencesClick instead",
  );
  await trackFilterReferencesClick(
    referenceIndexes,
    componentName,
    globalReferenceIndex,
    textBlockContent,
  );
};

// Track AI Mode page dwell time when user clicks "All" button
const trackAiModePageDwellTime = async (): Promise<void> => {
  try {
    console.log("🎯 Tracking AI Mode page dwell time");

    // Get page load time from navigation API or fallback to session storage
    let pageStartTime: number;

    if (
      typeof window !== "undefined" &&
      window.performance &&
      window.performance.navigation
    ) {
      // Use navigation start time
      pageStartTime = window.performance.timing.navigationStart;
      console.log("📊 Using navigation timing for page start time");
    } else {
      // Fallback: try to get from session storage
      const storedStartTime = sessionStorage.getItem("ai_mode_page_start_time");
      if (storedStartTime) {
        pageStartTime = parseInt(storedStartTime);
        console.log("📊 Using stored page start time from sessionStorage");
      } else {
        console.log(
          "⚠️ No page start time available, cannot calculate dwell time",
        );
        return;
      }
    }

    const dwellTimeMs = Date.now() - pageStartTime;
    const dwellTimeSec = Math.round((dwellTimeMs / 1000) * 10) / 10;

    console.log("⏱️ AI Mode page dwell time calculated:", {
      dwellTimeMs,
      dwellTimeSec,
      startTime: new Date(pageStartTime).toLocaleTimeString(),
      endTime: new Date().toLocaleTimeString(),
    });

    // Create a synthetic click event for AI Mode page visit
    const session = await getCurrentTaskSession();
    const clickTime = new Date(pageStartTime);

    const aiModeVisitEvent: ClickEvent = {
      task_id: session.task_id,
      click_order: getNextClickOrder(session),
      page_title: "AI Mode Page Visit",
      page_id: "ai_mode_page",
      position_in_serp: "ai_mode_visit",
      click_time: clickTime,
      dwell_time_sec: dwellTimeSec,
      from_overview: false,
      from_ai_mode: true,
      page_context: "ai_mode",
    };

    // Add to session
    session.click_sequence.push(aiModeVisitEvent);

    // Update sessionStorage
    const sessionKey = getSessionKey();
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    console.log("✅ AI Mode page dwell time recorded:", dwellTimeSec + "s");

    // Save to database
    await saveSessionToDatabase(session);
  } catch (error) {
    console.error("Failed to track AI Mode page dwell time:", error);
  }
};

let isTracking = false; // in-memory flag to prevent duplicate processing
let lastProcessedStack: string | null = null; // track last processed stack item to prevent duplicates

export const trackReturnFromLink = async (caller?: string): Promise<void> => {
  // 获取调用堆栈信息
  const stack = new Error().stack;
  const callerInfo = stack?.split("\n")[2]?.trim() || "unknown";
  const timestamp = new Date().toISOString();

  console.log("🔙 [Return] trackReturnFromLink called", {
    timestamp,
    caller: caller || "not specified",
    url: window.location.href,
    documentVisibility: document.visibilityState,
    windowFocused: document.hasFocus(),
    stackTrace: callerInfo,
  });

  // Special handling for AI Mode "All" button clicks
  if (caller === "ai_mode_all_button") {
    console.log(
      "🎯 AI Mode All button click detected - tracking page dwell time",
    );
    await trackAiModePageDwellTime();
    return;
  }

  // Simple deduplication: prevent concurrent processing
  if (isTracking) {
    console.log("⏳ [Return] Already tracking, skipping", {
      caller: caller || "not specified",
      reason: "concurrent_processing_prevention",
    });
    return;
  }

  // Check if we have a pending click event before proceeding
  const eventStackKey = getClickEventStackKey();
  const currentStackContent = sessionStorage.getItem(eventStackKey);

  if (!currentStackContent || currentStackContent === "[]") {
    console.log("❌ [Return] No click events in stack", {
      caller: caller || "not specified",
      eventStackKey,
      hasStack: currentStackContent !== null,
      stackContent: currentStackContent,
      reason: "empty_stack",
    });
    return;
  }

  // Prevent processing the same stack state multiple times (but allow different callers)
  const stackStateKey = `${currentStackContent}_${caller}`;
  if (lastProcessedStack === stackStateKey) {
    console.log("🔄 [Return] Duplicate detected, skipping", {
      caller: caller || "not specified",
      stackStateKey: stackStateKey.substring(0, 100) + "...",
      reason: "already_processed",
    });
    return;
  }

  // Pop the most recent click event from the stack
  const stackItem = popClickEventFromStack();
  
  if (!stackItem) {
    console.log("❌ [Return] No click event in stack", {
      caller: caller || "not specified",
      sessionStorageKeys: Object.keys(sessionStorage).filter(k => k.includes("click")),
      reason: "stack_empty_after_pop",
    });
    return;
  }

  console.log("✅ [Return] User returned from tracked link", {
    caller: caller || "not specified",
    pageId: stackItem.clickEvent.page_id,
    pageTitle: stackItem.clickEvent.page_title,
    clickOrder: stackItem.clickEvent.click_order,
  });

  // Record that we're processing this specific stack content with this caller
  lastProcessedStack = stackStateKey;
  isTracking = true; // lock

  try {
    const { clickEvent, startTime } = stackItem;

    // Ensure click_time is a Date object
    if (clickEvent.click_time && !(clickEvent.click_time instanceof Date)) {
      clickEvent.click_time = new Date(clickEvent.click_time);
    }

    if (!clickEvent || !startTime) {
      console.log("❌ [DwellTime] Missing data, aborting", {
        hasClickEvent: !!clickEvent,
        hasStartTime: !!startTime,
      });
      return;
    }

    const dwellTimeMs = Date.now() - Number.parseInt(startTime);
    const dwellTimeSec = Math.round((dwellTimeMs / 1000) * 10) / 10;
    clickEvent.dwell_time_sec = dwellTimeSec;

    console.log("⏱️ [DwellTime] Calculated", {
      pageId: clickEvent.page_id,
      pageTitle: clickEvent.page_title.substring(0, 50),
      dwellTimeSec: dwellTimeSec + "s",
      dwellTimeMs: dwellTimeMs + "ms",
      startTime: new Date(Number(startTime)).toISOString(),
      endTime: new Date().toISOString(),
      triggeredBy: caller || "not specified",
      taskId: clickEvent.task_id,
      clickOrder: clickEvent.click_order,
    });

    const session = await getCurrentTaskSession();

    console.log("🔍 [DwellTime] Finding existing click event in session...");

    // Find the existing click event and update its dwell time
    const clickTimeString =
      clickEvent.click_time instanceof Date
        ? clickEvent.click_time.toISOString()
        : new Date(clickEvent.click_time).toISOString();
    const existingClickIndex = session.click_sequence.findIndex((c) => {
      const existingClickTimeString =
        c.click_time instanceof Date
          ? c.click_time.toISOString()
          : new Date(c.click_time).toISOString();
      return (
        existingClickTimeString === clickTimeString &&
        c.page_id === clickEvent.page_id
      );
    });

    if (existingClickIndex !== -1) {
      // Update the existing click event with dwell time
      const oldDwellTime = session.click_sequence[existingClickIndex].dwell_time_sec;
      session.click_sequence[existingClickIndex].dwell_time_sec =
        clickEvent.dwell_time_sec;
      console.log("✅ [DwellTime] Updated existing click event", {
        index: existingClickIndex,
        pageId: clickEvent.page_id,
        oldDwellTime: oldDwellTime ? oldDwellTime + "s" : "null",
        newDwellTime: clickEvent.dwell_time_sec + "s",
      });
    } else {
      // If not found, add as new click event (fallback)
      session.click_sequence.push(clickEvent);
      console.log("⚠️ [DwellTime] Click event not found, added as new", {
        pageId: clickEvent.page_id,
        clickOrder: clickEvent.click_order,
        dwellTime: clickEvent.dwell_time_sec + "s",
      });
    }

    const sessionKey = getSessionKey();
    sessionStorage.setItem(sessionKey, JSON.stringify(session));

    console.log("💾 [Database] Updating session with dwell time...", {
      taskId: session.task_id,
      participantId: session.participant_id,
      clickSequenceLength: session.click_sequence.length,
      triggeredBy: caller || "not specified",
    });
    
    await saveSessionToDatabase(session);
    console.log("✅ [Database] Dwell time saved successfully");
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
