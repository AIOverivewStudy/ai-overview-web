"use client"
import { SearchPageTemplate } from "@/components/search-page-template"
import { useParams } from "next/navigation"
import { notFound } from "next/navigation"

// 配置映射：根据mode和variant确定页面配置
const getModeConfig = (mode: string, variant: string) => {
  const configs: Record<string, Record<string, {
    searchTabsVariant: 'default' | 'no-ai-mode',
    showAiOverview: boolean,
    aiOverviewPosition: 'top' | 'middle' | 'none'
  }>> = {
    'no-ai-overview': {
      'no-ai-mode': {
        searchTabsVariant: 'no-ai-mode',
        showAiOverview: false,
        aiOverviewPosition: 'none'
      },
      'have-ai-mode': {
        searchTabsVariant: 'default',
        showAiOverview: false,
        aiOverviewPosition: 'none'
      }
    },
    'middle-ai-overview': {
      'no-ai-mode': {
        searchTabsVariant: 'no-ai-mode',
        showAiOverview: true,
        aiOverviewPosition: 'middle'
      },
      'have-ai-mode': {
        searchTabsVariant: 'default',
        showAiOverview: true,
        aiOverviewPosition: 'middle'
      }
    },
    'top-ai-overview': {
      'no-ai-mode': {
        searchTabsVariant: 'no-ai-mode',
        showAiOverview: true,
        aiOverviewPosition: 'top'
      },
      'have-ai-mode': {
        searchTabsVariant: 'default',
        showAiOverview: true,
        aiOverviewPosition: 'top'
      }
    }
  }
  
  return configs[mode]?.[variant] || null
}

// 验证路由参数的有效性
const validateParams = (topic: string, mode: string, variant: string, page: string) => {
  const validTopics = ['Car-vehicle', 'Chatgpt', 'Cruise', 'Laptop', 'March-madness', 'NFL-game', 'Phone', 'Taylor-swift']
  const validModes = ['no-ai-overview', 'middle-ai-overview', 'top-ai-overview']
  const validVariants = ['no-ai-mode', 'have-ai-mode']
  
  const pageNum = parseInt(page, 10)
  
  return (
    validTopics.includes(topic) &&
    validModes.includes(mode) &&
    validVariants.includes(variant) &&
    !isNaN(pageNum) &&
    pageNum >= 1 &&
    pageNum <= 4
  )
}

export default function DynamicSearchPage() {
  const params = useParams()
  const topic = params.topic as string
  const mode = params.mode as string
  const variant = params.variant as string
  const page = params.page as string
  
  // 验证参数
  if (!validateParams(topic, mode, variant, page)) {
    notFound()
  }
  
  // 获取配置
  const modeConfig = getModeConfig(mode, variant)
  if (!modeConfig) {
    notFound()
  }
  
  const pageNumber = parseInt(page, 10)
  
  return (
    <SearchPageTemplate 
      config={{
        topic: topic,
        pageNumber: pageNumber,
        showVideos: true,
        showDiscussions: true,
        ...modeConfig
      }}
    />
  )
}
