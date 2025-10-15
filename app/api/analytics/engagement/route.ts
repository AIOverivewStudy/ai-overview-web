import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface EngagementData {
  totalTimeOnPage: number;
  activeTime: number;
  idleTime: number;
  visibilityChanges: number;
  scrollDepth: number;
  interactions: number;
  sessionStart: number;
  lastActivity: number;
  url: string;
  userAgent: string;
  referrer: string;
}

interface TaskSession {
  task_id: string;
  id: number;
  participant_id: string;
  treatment_group: string;
  task_topic: string;
  task_type: string;
  task_start_time: string;
}

interface EngagementEvent {
  type: "page_engagement";
  data: EngagementData;
  taskSession?: TaskSession | null;
  pageContext?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EngagementEvent = await request.json();

    // 验证数据结构
    if (!body.data || body.type !== "page_engagement") {
      return NextResponse.json(
        { error: "Invalid engagement data format" },
        { status: 400 },
      );
    }

    const {
      totalTimeOnPage,
      activeTime,
      idleTime,
      visibilityChanges,
      scrollDepth,
      interactions,
      sessionStart,
      lastActivity,
      url,
      userAgent,
      referrer,
    } = body.data;

    const { taskSession, pageContext } = body;

    // 数据验证
    if (typeof totalTimeOnPage !== "number" || totalTimeOnPage < 0) {
      return NextResponse.json(
        { error: "Invalid totalTimeOnPage value" },
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
    
    if (activeTime > totalTimeOnPage) {
      console.warn("⚠️ [Engagement API] activeTime exceeds totalTimeOnPage, correcting...", {
        original_activeTime: Math.round(activeTime / 1000) + "s",
        original_idleTime: Math.round(idleTime / 1000) + "s",
        totalTimeOnPage: Math.round(totalTimeOnPage / 1000) + "s",
      });
      correctedActiveTime = totalTimeOnPage;
      correctedIdleTime = 0;
    } else if (idleTime < 0) {
      console.warn("⚠️ [Engagement API] idleTime is negative, correcting...", {
        original_idleTime: Math.round(idleTime / 1000) + "s",
        activeTime: Math.round(activeTime / 1000) + "s",
        totalTimeOnPage: Math.round(totalTimeOnPage / 1000) + "s",
      });
      correctedIdleTime = Math.max(0, totalTimeOnPage - activeTime);
    }

    // 获取客户端IP和其他信息
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 计算参与度指标
    const engagementRate =
      totalTimeOnPage > 0 ? (correctedActiveTime / totalTimeOnPage) * 100 : 0;

    // 在控制台记录数据（所有环境，便于诊断）
    console.log("📊 [Engagement API] Received data:", {
      env: process.env.NODE_ENV,
      taskId: taskSession?.task_id,
      participantId: taskSession?.participant_id,
      url: url,
      totalTime: `${Math.round(totalTimeOnPage / 1000)}s`,
      activeTime: `${Math.round(correctedActiveTime / 1000)}s`,
      idleTime: `${Math.round(correctedIdleTime / 1000)}s`,
      engagementRate: `${Math.round(engagementRate * 100) / 100}%`,
      scrollDepth: `${scrollDepth}%`,
      interactions: interactions,
      visibilityChanges: visibilityChanges,
      pageContext: pageContext,
      ...(correctedActiveTime !== activeTime || correctedIdleTime !== idleTime 
        ? { corrected: true, original_activeTime: `${Math.round(activeTime / 1000)}s`, original_idleTime: `${Math.round(idleTime / 1000)}s` }
        : {}),
    });

    // 发送到PostHog (如果已配置)
    try {
      if (process.env.POSTHOG_KEY) {
        const { PostHog } = require("posthog-node");
        const client = new PostHog(process.env.POSTHOG_KEY, {
          host: process.env.POSTHOG_HOST || "https://app.posthog.com",
        });

        client.capture({
          distinctId: taskSession?.participant_id || "anonymous",
          event: "page_engagement_detailed",
          properties: {
            task_id: taskSession?.task_id,
            participant_id: taskSession?.participant_id,
            treatment_group: taskSession?.treatment_group,
            task_topic: taskSession?.task_topic,
            task_type: taskSession?.task_type,
            total_time_on_page: totalTimeOnPage,
            active_time: activeTime,
            idle_time: idleTime,
            engagement_rate: Math.round(engagementRate * 100) / 100,
            visibility_changes: visibilityChanges,
            scroll_depth: scrollDepth,
            interactions: interactions,
            url: url,
            referrer: referrer,
            user_agent: userAgent,
            session_start: new Date(sessionStart).toISOString(),
            last_activity: new Date(lastActivity).toISOString(),
            page_context: pageContext,
          },
        });

        await client.shutdown();
      }
    } catch (posthogError) {
      console.error("PostHog tracking failed:", posthogError);
      // 不阻断主流程
    }

    // 保存到数据库
    let savedRecord = null;
    try {
      if (taskSession && taskSession.task_id) {
        // 首先查找TaskRecord
        const taskRecord = await prisma.taskRecord.findUnique({
          where: { task_id: taskSession.task_id },
        });

        if (taskRecord) {
          // 使用upsert根据 task_record_id + url 更新或创建记录
          // 每个 participant 在整个任务期间，同一个 URL 只有一条记录
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          savedRecord = await (prisma as any).pageEngagement.upsert({
            where: {
              // 复合唯一键：task_record_id + url
              task_record_id_url: {
                task_record_id: taskRecord.id,
                url: url,
              },
            },
            update: {
              url,
              referrer: referrer || null,
              user_agent: userAgent,
              client_ip: clientIP,
              total_time_on_page: totalTimeOnPage,
              active_time: correctedActiveTime,
              idle_time: correctedIdleTime,
              visibility_changes: visibilityChanges,
              scroll_depth: scrollDepth,
              interactions: interactions,
              engagement_rate: Math.round(engagementRate * 100) / 100,
              last_activity: new Date(lastActivity),
              page_context: pageContext || null,
            },
            create: {
              task_record_id: taskRecord.id,
              task_id: taskSession.task_id,
              url,
              referrer: referrer || null,
              user_agent: userAgent,
              client_ip: clientIP,
              total_time_on_page: totalTimeOnPage,
              active_time: correctedActiveTime,
              idle_time: correctedIdleTime,
              visibility_changes: visibilityChanges,
              scroll_depth: scrollDepth,
              interactions: interactions,
              engagement_rate: Math.round(engagementRate * 100) / 100,
              session_start: new Date(sessionStart),
              last_activity: new Date(lastActivity),
              page_context: pageContext || null,
            },
          });

          console.log("✅ [Engagement API] Saved to database:", {
            env: process.env.NODE_ENV,
            id: savedRecord.id,
            taskId: savedRecord.task_id,
            url: savedRecord.url,
            activeTimeSeconds: Math.round(savedRecord.active_time / 1000),
          });
        } else {
          console.warn(
            `⚠️ [Engagement API] TaskRecord not found for task_id: ${taskSession.task_id}`,
          );
        }
      } else {
        console.warn(
          "⚠️ [Engagement API] No valid taskSession provided, skipping database save",
          {
            hasTaskSession: !!taskSession,
            hasTaskId: !!taskSession?.task_id,
          }
        );
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
          taskId: taskSession?.task_id,
          participantId: taskSession?.participant_id,
          url: url,
          activeTimeSeconds: Math.round(activeTime / 1000),
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
