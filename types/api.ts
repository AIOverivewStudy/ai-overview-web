// 统一的类型定义文件 - 前后端共用

// ComponentName 类型定义 - 所有可能的组件名称
export type ComponentName = 
  // 搜索结果相关
  | "SearchResults"      // 有机搜索结果
  | "SearchResults-Sitelinks"  // 搜索结果下的站点链接
  | `SearchResults_${number}`  // 动态页面的搜索结果，如 SearchResults_1, SearchResults_2
  | `SearchResults-Sitelinks_${number}`  // 动态页面的站点链接
  
  // AI 功能相关
  | "AiOverview"         // AI概览主体
  | "AiOverview-References"  // AI概览参考链接
  | "AiMode-Sidebar"     // AI模式侧边栏
  | "AIMode"             // AI模式
  
  // 搜索界面元素
  | "SearchTabs"         // 搜索标签页
  | "PeopleAlsoSearch"   // 人们也搜索
  
  // 内容区块
  | "Video"              // 视频内容
  | "DiscussionsForums"  // 讨论论坛（旧）
  | "DiscussionsAndForums"  // 讨论论坛（新）
  
  // 分页相关
  | "clickPagination_"   // 分页点击
  
  // 交互按钮组件名称（用于 trackShowMoreClick 和 trackShowAllClick）
export type InteractionComponentName = 
  | "AiOverview"         // AI概览展开
  | "AiMode"             // AI模式展开
  | "DiscussionsAndForums"  // 讨论论坛展开
  | "VideosSection"      // 视频区域展开

export interface ClickEvent {
  task_id: string
  click_order: number
  page_title: string
  page_id: string
  position_in_serp: string
  click_time: string
  dwell_time_sec?: number | null
  from_overview: boolean
  from_ai_mode: boolean
}

export interface ShowMoreInteraction {
  task_id: string
  click_order: number
  component_name: string
  click_time: string
}

export interface ShowAllInteraction {
  task_id: string
  click_order: number
  component_name: string
  click_time: string
}

export interface TaskSession {
  id?: number
  participant_id: string
  treatment_group: string
  task_id: string
  task_topic: string
  task_type: string
  task_start_time: string
  task_end_time?: string | null
  page_click_statics_1: number
  page_click_statics_2: number
  page_click_statics_3: number
  page_click_statics_4: number
  click_sequence: ClickEvent[]
  show_more_interactions: ShowMoreInteraction[]
  show_all_interactions: ShowAllInteraction[]
}

// 其他用到的类型
export interface LinkClickEvent {
  componentName: string
  linkIndex: number
  url: string
  timestamp: number
  from_overview?: boolean
  from_ai_mode?: boolean
  duration: number
  returnTimestamp: number
}