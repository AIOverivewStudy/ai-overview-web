// 被试专用API - 最简版本，只保存数据
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TaskSession } from '@/types/api'

// POST /api/participant/task-records - 直接将整个对象扔给Prisma
export async function POST(request: NextRequest) {
  try {
    const data: TaskSession = await request.json()
    
    // 基本验证
    if (!data.participant_id || !data.task_id) {
      return NextResponse.json(
        { error: 'participant_id and task_id are required' },
        { status: 400 }
      )
    }

    // 分离嵌套数据和主数据，排除id字段（由数据库自动生成）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, click_sequence, show_more_interactions, show_all_interactions, ...mainData } = data

    // 先获取现有记录以确定哪些子记录需要新增
    const existingRecord = await prisma.taskRecord.findUnique({
      where: { task_id: data.task_id },
      include: {
        click_sequence: true,
        show_more_interactions: true,
        show_all_interactions: true,
      },
    })

    if (existingRecord) {
      // 记录已存在，只添加新的子记录
      // 使用click_time和page_id组合来识别重复的点击事件
      const existingClickKeys = new Set(
        existingRecord.click_sequence.map(c => `${c.click_time}_${c.page_id}`)
      )
      // 使用click_time和component_name组合来识别重复的交互事件
      const existingShowMoreKeys = new Set(
        existingRecord.show_more_interactions.map(s => `${s.click_time}_${s.component_name}`)
      )
      const existingShowAllKeys = new Set(
        existingRecord.show_all_interactions.map(s => `${s.click_time}_${s.component_name}`)
      )

      const newClickEvents = (click_sequence || [])
        .filter(c => !existingClickKeys.has(`${c.click_time}_${c.page_id}`))
      
      const newShowMoreInteractions = (show_more_interactions || [])
        .filter(s => !existingShowMoreKeys.has(`${s.click_time}_${s.component_name}`))
      
      const newShowAllInteractions = (show_all_interactions || [])
        .filter(s => !existingShowAllKeys.has(`${s.click_time}_${s.component_name}`))

      const result = await prisma.taskRecord.update({
        where: { task_id: data.task_id },
        data: {
          ...mainData,
          click_sequence: {
            create: newClickEvents,
          },
          show_more_interactions: {
            create: newShowMoreInteractions,
          },
          show_all_interactions: {
            create: newShowAllInteractions,
          },
        },
        include: {
          click_sequence: true,
          show_more_interactions: true,
          show_all_interactions: true,
        },
      })
      return NextResponse.json(result, { status: 200 })
    } else {
      // 记录不存在，创建新记录
      const result = await prisma.taskRecord.create({
        data: {
          ...mainData,
          click_sequence: {
            create: click_sequence || [],
          },
          show_more_interactions: {
            create: show_more_interactions || [],
          },
          show_all_interactions: {
            create: show_all_interactions || [],
          },
        },
        include: {
          click_sequence: true,
          show_more_interactions: true,
          show_all_interactions: true,
        },
      })
      return NextResponse.json(result, { status: 201 })
    }
  } catch (error) {
    console.error('Error saving task record:', error)
    return NextResponse.json(
      { error: 'Failed to save task record' },
      { status: 500 }
    )
  }
}