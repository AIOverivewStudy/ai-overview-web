// Database service for saving analytics data to the backend API

// 统一使用types/api.ts中的类型定义
import type { TaskSession } from "@/types/api"

// Updated to use participant-specific API routes
const API_BASE_URL = "/api/participant/task-records"

// Save task record in database - 超级简化版，直接传递
export const saveTaskRecord = async (session: TaskSession): Promise<boolean> => {
  try {
    console.log(`Attempting to save/update record for task_id: ${session.task_id}`)

    // 直接POST到API，让API处理upsert逻辑
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(session),
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`Successfully saved task record:`, result)
      return true
    } else {
      const errorText = await response.text()
      console.error(`Failed to save task record: ${response.status} ${response.statusText}`, errorText)
      return false
    }
  } catch (error) {
    console.error("Error saving task record:", error)
    return false
  }
}

// Save task record with retry logic
export const saveTaskRecordWithRetry = async (session: TaskSession, maxRetries = 3): Promise<boolean> => {
  const success = await saveTaskRecord(session)
    if (success) {
      return true
    }
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Save attempt ${attempt}/${maxRetries} for session:`, session.participant_id)
    

    // if (attempt < maxRetries) {
    //   // Wait before retrying (exponential backoff)
    //   const delay = Math.pow(2, attempt) * 1000
    //   console.log(`Retrying save in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
    //   await new Promise((resolve) => setTimeout(resolve, delay))
    // }
  }

  console.error(`Failed to save task record after ${maxRetries} attempts`)
  return false
}

// 删除了所有不需要的获取、删除和测试函数
// 被试只需要保存数据，不需要读取或删除
