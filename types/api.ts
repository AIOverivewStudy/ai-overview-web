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
  
  // 引用链接相关
  | "ReferenceLink"      // 引用链接点击 (LinkIcon)
  
  // 页面上下文类型 - 标记事件发生的页面环境
export type PageContext = 
  | "search_results"     // 普通搜索结果页面
  | "ai_mode"            // AI模式页面

// 交互按钮组件名称（用于 trackShowAllContentClick 和 trackShowAllReferencesClick）
export type InteractionComponentName = 
  | "AiOverview"         // AI概览展开
  | "AiMode"             // AI模式展开
  | "DiscussionsAndForums"  // 讨论论坛展开
  | "VideosSection"      // 视频区域展开
  | "AiOverview_FilterReferences"  // AI概览筛选引用
  | "AiMode_FilterReferences"      // AI模式筛选引用

export interface ClickEvent {
  task_id: string
  click_order: number
  page_title: string
  page_id: string
  position_in_serp: string
  click_time: Date  // UTC timestamp as Date object
  dwell_time_sec?: number | null
  from_overview: boolean
  from_ai_mode: boolean
  page_context?: PageContext  // 标记事件发生的页面上下文
}

export interface ShowAllContentClick {
  task_id: string
  click_order: number
  component_name: string
  click_time: Date  // UTC timestamp as Date object
  page_context?: PageContext  // 标记事件发生的页面上下文
}

export interface ShowAllReferencesClick {
  task_id: string
  click_order: number
  component_name: string
  click_time: Date  // UTC timestamp as Date object
  page_context?: PageContext  // 标记事件发生的页面上下文
  // 筛选引用相关的详细信息
  filter_reference_indexes: number[]  // 被筛选的引用索引（必需字段，默认为空数组）
  global_reference_index?: number  // LinkIcon 的全局引用索引（从页面顶部开始计数）
  text_block_content?: string  // 文本块的内容摘要
  filtered_references_count?: number  // 筛选出的引用数量
}

export interface TaskSession {
  id?: number
  participant_id: string
  treatment_group: string
  task_id: string
  task_topic: string
  task_type: string
  task_start_time: Date  // UTC timestamp as Date object
  page_click_statics_1: number
  page_click_statics_2: number
  page_click_statics_3: number
  page_click_statics_4: number
  click_sequence: ClickEvent[]
  show_all_content_clicks: ShowAllContentClick[]
  show_all_references_clicks: ShowAllReferencesClick[]
}

// 其他用到的类型
export interface LinkClickEvent {
  componentName: string
  linkIndex: number
  url: string
  timestamp: Date
  from_overview?: boolean
  from_ai_mode?: boolean
  duration: number
  returnTimestamp: Date
}