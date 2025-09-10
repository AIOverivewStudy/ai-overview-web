// 被试专用API - 最简版本，只保存数据
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TaskSession } from '@/types/api'

// 序列化 Date 对象和 BigInt 为 JSON
const serializeForJSON = (obj: unknown): unknown => {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return Number(value)
    }
    if (value instanceof Date) {
      return value.toISOString()
    }
    return value
  }))
}

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
    const { id: _, click_sequence, show_all_content_clicks, show_all_references_clicks, ...mainData } = data

    // 先获取现有记录以确定哪些子记录需要新增
    const existingRecord = await prisma.taskRecord.findUnique({
      where: { task_id: data.task_id },
      include: {
        click_sequence: true,
        show_all_content_clicks: true,
        show_all_references_clicks: true,
      },
    })

    if (existingRecord) {
      // 记录已存在，只添加新的子记录
      // 使用click_time和page_id组合来识别重复的点击事件
      const existingClickKeys = new Set(
        existingRecord.click_sequence.map(c => `${c.click_time.toISOString()}_${c.page_id}`)
      )
      // 使用click_time和component_name组合来识别重复的交互事件
      const existingShowAllContentKeys = new Set(
        existingRecord.show_all_content_clicks.map(s => `${s.click_time.toISOString()}_${s.component_name}`)
      )
      const existingShowAllReferencesKeys = new Set(
        existingRecord.show_all_references_clicks.map(s => `${s.click_time.toISOString()}_${s.component_name}`)
      )

      // Handle dwell time updates: if a click event has the same click_time and page_id but different dwell_time,
      // we should update the existing record instead of treating it as a duplicate
      const newClickEvents = (click_sequence || []).map(c => ({ 
        ...c, 
        task_id: data.task_id,
        click_time: c.click_time instanceof Date ? c.click_time : new Date(c.click_time)
      }))
      
      // Separate truly new events from dwell time updates
      const clickEventsToCreate = newClickEvents.filter(c => {
        const clickKey = `${c.click_time.toISOString()}_${c.page_id}`;
        return !existingClickKeys.has(clickKey);
      });
      
      // Handle dwell time updates for existing events
      for (const newEvent of newClickEvents) {
        const clickKey = `${newEvent.click_time.toISOString()}_${newEvent.page_id}`;
        if (existingClickKeys.has(clickKey) && newEvent.dwell_time_sec !== null) {
          // Update existing click event with dwell time
          const existingEvent = existingRecord.click_sequence.find(c => 
            c.click_time.toISOString() === newEvent.click_time.toISOString() && 
            c.page_id === newEvent.page_id
          );
          if (existingEvent && existingEvent.dwell_time_sec === null) {
            console.log(`Updating dwell time for event ${clickKey}: ${newEvent.dwell_time_sec}s`);
            await prisma.clickEvent.update({
              where: { id: existingEvent.id },
              data: { dwell_time_sec: newEvent.dwell_time_sec }
            });
          }
        }
      }
      
      const newShowAllContentClicks = (show_all_content_clicks || [])
        .filter(s => !existingShowAllContentKeys.has(`${s.click_time instanceof Date ? s.click_time.toISOString() : new Date(s.click_time).toISOString()}_${s.component_name}`))
        .map(s => ({ 
          ...s, 
          task_id: data.task_id,
          click_time: s.click_time instanceof Date ? s.click_time : new Date(s.click_time)
        }))
      
      const newShowAllReferencesClicks = (show_all_references_clicks || [])
        .filter(s => !existingShowAllReferencesKeys.has(`${s.click_time instanceof Date ? s.click_time.toISOString() : new Date(s.click_time).toISOString()}_${s.component_name}`))
        .map(s => ({ 
          ...s, 
          task_id: data.task_id,
          click_time: s.click_time instanceof Date ? s.click_time : new Date(s.click_time)
        }))

      const result = await prisma.taskRecord.update({
        where: { task_id: data.task_id },
        data: {
          ...mainData,
          task_start_time: mainData.task_start_time instanceof Date ? mainData.task_start_time : new Date(mainData.task_start_time),
          click_sequence: {
            create: clickEventsToCreate,
          },
          show_all_content_clicks: {
            create: newShowAllContentClicks,
          },
          show_all_references_clicks: {
            create: newShowAllReferencesClicks,
          },
        },
        include: {
          click_sequence: true,
          show_all_content_clicks: true,
          show_all_references_clicks: true,
        },
      })
      return NextResponse.json(serializeForJSON(result), { status: 200 })
    } else {
      // 记录不存在，创建新记录
      const result = await prisma.taskRecord.create({
        data: {
          ...mainData,
          task_start_time: mainData.task_start_time instanceof Date ? mainData.task_start_time : new Date(mainData.task_start_time),
          click_sequence: {
            create: (click_sequence || []).map(c => ({ 
              ...c, 
              task_id: data.task_id,
              click_time: c.click_time instanceof Date ? c.click_time : new Date(c.click_time)
            })),
          },
          show_all_content_clicks: {
            create: (show_all_content_clicks || []).map(s => ({ 
              ...s, 
              task_id: data.task_id,
              click_time: s.click_time instanceof Date ? s.click_time : new Date(s.click_time)
            })),
          },
          show_all_references_clicks: {
            create: (show_all_references_clicks || []).map(s => ({ 
              ...s, 
              task_id: data.task_id,
              click_time: s.click_time instanceof Date ? s.click_time : new Date(s.click_time)
            })),
          },
        },
        include: {
          click_sequence: true,
          show_all_content_clicks: true,
          show_all_references_clicks: true,
        },
      })
      return NextResponse.json(serializeForJSON(result), { status: 201 })
    }
  } catch (error) {
    console.error('Error saving task record:', error)
    return NextResponse.json(
      { error: 'Failed to save task record' },
      { status: 500 }
    )
  }
}