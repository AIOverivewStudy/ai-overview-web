import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface EngagementData {
  totalTimeOnTask: number;   // 整个任务的总时间
  activeTime: number;         // 累积活跃时间
  idleTime: number;           // 累积空闲时间
  visibilityChanges: number;
  maxScrollDepth: number;     // 整个任务期间的最大滚动深度
  interactions: number;
  sessionStart: number;
  lastActivity: number;
  userAgent: string;
}

interface EngagementEvent {
  type: "page_engagement";
  data: EngagementData;
  participant_id: string;  // ✅ 只需要 RID
}

export async function POST(request: NextRequest) {
  try {
    // 检查请求体是否为空
    const contentLength = request.headers.get("content-length");
    if (!contentLength || contentLength === "0") {
      console.warn("⚠️ [Engagement API] Empty request body received");
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 },
      );
    }

    let body: EngagementEvent;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("❌ [Engagement API] Failed to parse JSON:", {
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        contentType: request.headers.get("content-type"),
        contentLength: contentLength,
      });
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // 验证数据结构
    if (!body.data || body.type !== "page_engagement") {
      return NextResponse.json(
        { error: "Invalid engagement data format" },
        { status: 400 },
      );
    }

    const {
      totalTimeOnTask,
      activeTime,
      idleTime,
      visibilityChanges,
      maxScrollDepth,
      interactions,
      sessionStart,
      lastActivity,
      userAgent,
    } = body.data;

    const { participant_id } = body;

    // 验证 participant_id 必需
    if (!participant_id || typeof participant_id !== "string") {
      console.warn("⚠️ [Engagement API] Missing or invalid participant_id", { body });
      return NextResponse.json(
        { error: "participant_id is required" },
        { status: 400 },
      );
    }

    // 数据验证
    if (typeof totalTimeOnTask !== "number" || totalTimeOnTask < 0) {
      return NextResponse.json(
        { error: "Invalid totalTimeOnTask value" },
        { status: 400 },
      );
    }

    if (typeof activeTime !== "number" || activeTime < 0) {
      return NextResponse.json(
        { error: "Invalid activeTime value" },
        { status: 400 },
      );
    }

    // 修正 activeTime 和 idleTime（防止前端累积错误）
    let correctedActiveTime = activeTime;
    let correctedIdleTime = idleTime;
    
    if (activeTime > totalTimeOnTask) {
      console.warn("⚠️ [Engagement API] activeTime exceeds totalTimeOnTask, correcting...", {
        original_activeTime: Math.round(activeTime / 1000) + "s",
        original_idleTime: Math.round(idleTime / 1000) + "s",
        totalTimeOnTask: Math.round(totalTimeOnTask / 1000) + "s",
      });
      correctedActiveTime = totalTimeOnTask;
      correctedIdleTime = 0;
    } else if (idleTime < 0) {
      console.warn("⚠️ [Engagement API] idleTime is negative, correcting...", {
        original_idleTime: Math.round(idleTime / 1000) + "s",
        activeTime: Math.round(activeTime / 1000) + "s",
        totalTimeOnTask: Math.round(totalTimeOnTask / 1000) + "s",
      });
      correctedIdleTime = Math.max(0, totalTimeOnTask - activeTime);
    }

    // 获取客户端IP
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 计算参与度指标
    const engagementRate =
      totalTimeOnTask > 0 ? (correctedActiveTime / totalTimeOnTask) * 100 : 0;

    // 在控制台记录数据（所有环境，便于诊断）
    console.log("📊 [Engagement API] Received data:", {
      env: process.env.NODE_ENV,
      participantId: participant_id,
      totalTime: `${Math.round(totalTimeOnTask / 1000)}s`,
      activeTime: `${Math.round(correctedActiveTime / 1000)}s`,
      idleTime: `${Math.round(correctedIdleTime / 1000)}s`,
      engagementRate: `${Math.round(engagementRate * 100) / 100}%`,
      maxScrollDepth: `${maxScrollDepth}%`,
      interactions: interactions,
      visibilityChanges: visibilityChanges,
      ...(correctedActiveTime !== activeTime || correctedIdleTime !== idleTime 
        ? { corrected: true, original_activeTime: `${Math.round(activeTime / 1000)}s`, original_idleTime: `${Math.round(idleTime / 1000)}s` }
        : {}),
    });

    // 🎯 根据 participant_id 查找最新的 TaskRecord
    let taskRecord = null;
    try {
      await prisma.$connect();
      taskRecord = await prisma.taskRecord.findFirst({
        where: { participant_id: participant_id },
        orderBy: { task_start_time: 'desc' }, // 最新的任务
      });
      
      if (!taskRecord) {
        console.warn(`⚠️ [Engagement API] No TaskRecord found for participant: ${participant_id}`);
        return NextResponse.json(
          { error: "TaskRecord not found for this participant" },
          { status: 404 },
        );
      }
    } catch (error) {
      console.error("❌ [Engagement API] Failed to fetch TaskRecord", error);
      return NextResponse.json(
        { error: "Failed to fetch TaskRecord" },
        { status: 500 },
      );
    }

    // 发送到PostHog (如果已配置)
    if (taskRecord) {
      try {
        if (process.env.POSTHOG_KEY) {
          const { PostHog } = require("posthog-node");
          const client = new PostHog(process.env.POSTHOG_KEY, {
            host: process.env.POSTHOG_HOST || "https://app.posthog.com",
          });

          client.capture({
            distinctId: taskRecord.participant_id,
            event: "page_engagement_detailed",
            properties: {
              task_record_id: taskRecord.id,
              task_id: taskRecord.task_id,
              participant_id: taskRecord.participant_id,
              treatment_group: taskRecord.treatment_group,
              task_topic: taskRecord.task_topic,
              task_type: taskRecord.task_type,
              total_time_on_task: totalTimeOnTask,
              active_time: correctedActiveTime,
              idle_time: correctedIdleTime,
              engagement_rate: Math.round(engagementRate * 100) / 100,
              visibility_changes: visibilityChanges,
              max_scroll_depth: maxScrollDepth,
              interactions: interactions,
              user_agent: userAgent,
              session_start: new Date(sessionStart).toISOString(),
              last_activity: new Date(lastActivity).toISOString(),
            },
          });

          await client.shutdown();
        }
      } catch (posthogError) {
        console.error("PostHog tracking failed:", posthogError);
        // 不阻断主流程
      }
    }

    // 保存到数据库
    let savedRecord = null;
    try {
      // 🎯 使用 task_record_id upsert（已从上面查询得到）
      // 📊 后端负责累加：前端发送增量，后端累加到总值
      let retries = 5;
      let lastError;
      
      while (retries > 0) {
        try {
          // 🔄 确保 Prisma 连接正常
          await prisma.$connect();
          
          // 先查询现有记录，用于累加
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingRecord = await (prisma as any).pageEngagement.findUnique({
            where: { task_record_id: taskRecord.id },
          });
          
          // 计算累加后的值
          const accumulatedTotalTime = existingRecord 
            ? existingRecord.total_time_on_task + totalTimeOnTask 
            : totalTimeOnTask;
          const accumulatedActiveTime = existingRecord 
            ? existingRecord.active_time + correctedActiveTime 
            : correctedActiveTime;
          const accumulatedIdleTime = existingRecord 
            ? existingRecord.idle_time + correctedIdleTime 
            : correctedIdleTime;
          const accumulatedVisibilityChanges = existingRecord 
            ? existingRecord.visibility_changes + visibilityChanges 
            : visibilityChanges;
          const accumulatedMaxScrollDepth = existingRecord 
            ? Math.max(existingRecord.max_scroll_depth, maxScrollDepth) 
            : maxScrollDepth;
          const accumulatedInteractions = existingRecord 
            ? existingRecord.interactions + interactions 
            : interactions;
          
          // 重新计算参与度（基于累积值）
          const accumulatedEngagementRate = accumulatedTotalTime > 0 
            ? (accumulatedActiveTime / accumulatedTotalTime) * 100 
            : 0;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          savedRecord = await (prisma as any).pageEngagement.upsert({
            where: {
              task_record_id: taskRecord.id, // ✅ 使用查询到的 task_record_id
            },
            update: {
              // 📈 累加增量数据
              user_agent: userAgent,
              client_ip: clientIP,
              total_time_on_task: accumulatedTotalTime,
              active_time: accumulatedActiveTime,
              idle_time: accumulatedIdleTime,
              visibility_changes: accumulatedVisibilityChanges,
              max_scroll_depth: accumulatedMaxScrollDepth,
              interactions: accumulatedInteractions,
              engagement_rate: Math.round(accumulatedEngagementRate * 100) / 100,
              last_activity: new Date(lastActivity),
            },
            create: {
              // 首次创建记录（直接使用前端发送的值）
              task_record_id: taskRecord.id,
              user_agent: userAgent,
              client_ip: clientIP,
              total_time_on_task: totalTimeOnTask,
              active_time: correctedActiveTime,
              idle_time: correctedIdleTime,
              visibility_changes: visibilityChanges,
              max_scroll_depth: maxScrollDepth,
              interactions: interactions,
              engagement_rate: Math.round(engagementRate * 100) / 100,
              session_start: new Date(sessionStart),
              last_activity: new Date(lastActivity),
            },
          });
          
          // 记录累加效果
          if (existingRecord) {
            console.log("📈 [Engagement API] Accumulated data", {
              increment: {
                totalTime: `+${Math.round(totalTimeOnTask / 1000)}s`,
                activeTime: `+${Math.round(correctedActiveTime / 1000)}s`,
              },
              accumulated: {
                totalTime: `${Math.round(accumulatedTotalTime / 1000)}s`,
                activeTime: `${Math.round(accumulatedActiveTime / 1000)}s`,
                engagementRate: `${Math.round(accumulatedEngagementRate * 100) / 100}%`,
              },
            });
          }
          
          // 成功，退出重试循环
          break;
        } catch (error) {
          lastError = error;
          retries--;
            
          if (retries > 0) {
            console.warn(`⚠️ [Engagement API] Upsert failed, retrying... (${retries} attempts left)`, {
              error: error instanceof Error ? error.message : String(error),
              errorType: error instanceof Error ? error.constructor.name : typeof error,
            });
            
            // 🔄 尝试重新连接 Prisma
            try {
              await prisma.$disconnect();
              await new Promise(resolve => setTimeout(resolve, 300 + (5 - retries) * 200)); // 递增等待时间
              await prisma.$connect();
            } catch (reconnectError) {
              console.error("Failed to reconnect Prisma:", reconnectError);
            }
          } else {
            console.error("❌ [Engagement API] Upsert failed after all retries", {
              error: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            });
            throw lastError;
          }
        }
      }

      if (savedRecord) {
        console.log("✅ [Engagement API] Saved to database:", {
          env: process.env.NODE_ENV,
          id: savedRecord.id,
          taskRecordId: savedRecord.task_record_id,
          activeTimeSeconds: Math.round(savedRecord.active_time / 1000),
        });
      }
    } catch (dbError) {
      console.error("Database save failed:", dbError);
      // 不阻断主流程，但记录错误
    }

    return NextResponse.json(
      {
        success: true,
        message: "Engagement data recorded successfully",
        summary: {
          participantId: participant_id,
          taskRecordId: taskRecord.id,
          activeTimeSeconds: Math.round(correctedActiveTime / 1000),
          engagementRate: Math.round(engagementRate * 100) / 100,
          savedToDatabase: savedRecord !== null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing engagement data:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : "Failed to process engagement data",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 支持OPTIONS请求用于CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
