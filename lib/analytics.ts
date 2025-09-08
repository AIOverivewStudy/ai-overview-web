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

  // Extract RID from query parameters or localStorage
  const participant_id =
    searchParams.get("RID") || localStorage.getItem("RID") || "0";

  if (participant_id !== "0") {
    localStorage.setItem("RID", participant_id);
  }

  let topic = "";
  let treatmentGroup = "";
  let originalTreatmentGroup = "";

  if (segments.length >= 2) {
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
          // 保存原始页面路径，用于返回导航
          localStorage.setItem("originalPathname", from);
        } else {
          originalTreatmentGroup = treatmentGroup;
        }
      } else {
        // 尝试从localStorage获取之前保存的原始treatment group
        const savedOriginalTreatmentGroup = localStorage.getItem("original_treatment_group");
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

// Get current UTC timestamp in milliseconds
const getCurrentUTCTimestamp = () => {
  return Date.now();
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

  console.log("Creating new session:", newSession);
  localStorage.setItem("current_task_session", JSON.stringify(newSession));
  
  // Store the original treatment group for navigation
  if (originalTreatmentGroup) {
    localStorage.setItem("original_treatment_group", originalTreatmentGroup);
  }

  // Save to database asynchronously
  const result = await saveSessionToDatabase(newSession);
  console.log("新增完成", result);

  return newSession;
};

// Get current task session
const getCurrentTaskSession = async (): Promise<TaskSession> => {
  const { topic, treatmentGroup, originalTreatmentGroup } = extractUrlParams();
  const taskType = getTaskType(topic);

  // Try to get existing session
  const existingSession = localStorage.getItem("current_task_session");
  if (existingSession) {
    try {
      const session: TaskSession = JSON.parse(existingSession);
      console.log(session);

      // For task continuity, we should maintain the same task if:
      // 1. Same topic and task type
      // 2. Either same treatment group OR navigating to/from AI Mode within same variant
      const isSameTask = session.task_topic === topic && 
                        session.task_type === taskType && 
                        (session.treatment_group === treatmentGroup || 
                         session.treatment_group === originalTreatmentGroup ||
                         (treatmentGroup === "ai-mode" && originalTreatmentGroup && session.treatment_group === originalTreatmentGroup));

      if (!isSameTask) {
        console.log(
          "Session parameters changed, ending current session and creating new one"
        );
        endTaskSession();
        return await createNewSession();
      }
      
      // Store the original path for navigation purposes
      if (originalTreatmentGroup && originalTreatmentGroup !== treatmentGroup) {
        localStorage.setItem("original_treatment_group", originalTreatmentGroup);
      }
      
      return session;
    } catch (error) {
      console.error("Failed to parse existing session from localStorage, creating new session:", error);
      localStorage.removeItem("current_task_session");
      return await createNewSession();
    }
  } else {
    console.log("No existing session found, creating new one");
    return await createNewSession();
  }
};

// Store link click in localStorage
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

  localStorage.setItem("current_click_event", JSON.stringify(clickEvent));
  console.log("💾 Click event saved:", clickEvent.page_id);

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

  localStorage.setItem("current_task_session", JSON.stringify(session));

  console.log(`Tracked click: ${pageId} - "${linkText}", updating database...`);

  // Add click event to session
  session.click_sequence.push(clickEvent);

  // Save updated session to database and wait for completion
  const result = await saveSessionToDatabase(session);
  console.log("保存结果", result);

  // Store click info for dwell time calculation
  const clickId = `${session.participant_id}_${session.task_topic}_${session.treatment_group}_${clickEvent.click_order}`;
  localStorage.setItem("current_click_id", clickId);
  localStorage.setItem("click_start_time", Date.now().toString());
  console.log("⏰ Click timer started");

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
  localStorage.setItem("current_task_session", JSON.stringify(currSession));

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
  localStorage.setItem("current_task_session", JSON.stringify(currSession));

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

export const trackReturnFromLink = async (): Promise<void> => {
  console.log("🔍 trackReturnFromLink called");
  
  if (isTracking) {
    console.log("⏳ Already tracking, skipping...");
    return;
  }
  
  const clickEventRaw = localStorage.getItem("current_click_event");
  console.log("💾 current_click_event in localStorage:", clickEventRaw ? "EXISTS" : "NOT FOUND");
  
  if (!clickEventRaw) {
    console.log("❌ No click event found, user did not come from a tracked link");
    return;
  }

  console.log("✅ User returned from a tracked link, processing dwell time...");
  isTracking = true; // lock

  try {
    let clickEvent: ClickEvent;
    try {
      clickEvent = JSON.parse(clickEventRaw);
    } catch (parseError) {
      console.error("Failed to parse click event from localStorage:", parseError);
      localStorage.removeItem("current_click_event");
      localStorage.removeItem("click_start_time");
      return;
    }

    const startTime = localStorage.getItem("click_start_time");
    
    console.log("📊 Click event data:", {
      clickEvent: clickEvent,
      startTime: startTime ? new Date(Number(startTime)).toLocaleTimeString() : "NOT FOUND"
    });

    localStorage.removeItem("current_click_event");
    localStorage.removeItem("click_start_time");
    console.log("🗑️ Cleared localStorage: current_click_event and click_start_time");

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
      endTime: new Date().toLocaleTimeString()
    });

    const session = await getCurrentTaskSession();

    console.log("🔍 Checking for duplicate click events...");
    
    // 使用click_time和page_id组合来检查重复
    if (
      session.click_sequence.some(
        (c) => c.click_time === clickEvent.click_time && c.page_id === clickEvent.page_id
      )
    ) {
      console.log("🚫 Duplicate click event detected, skipping...");
      return;
    }

    session.click_sequence.push(clickEvent);
    localStorage.setItem("current_task_session", JSON.stringify(session));

    console.log(`✅ Dwell time recorded: ${dwellTimeSec}s, updating database...`);
    await saveSessionToDatabase(session);
    console.log("💾 Database updated successfully");
  } finally {
    isTracking = false; // unlock
  }
};

export const endTaskSession = (): void => {
  const sessionRaw = localStorage.getItem("current_task_session");
  if (!sessionRaw) return;

  let taskId = "unknown";
  try {
    const session: TaskSession = JSON.parse(sessionRaw);
    taskId = `${session.participant_id}_${session.task_topic}_${session.treatment_group}`;
    saveSessionToDatabase(session);
  } catch (error) {
    console.error("Failed to parse session when ending task session:", error);
  }

  localStorage.removeItem("current_task_session");

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
