-- CreateTable
CREATE TABLE "page_engagements" (
    "id" SERIAL NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "referrer" TEXT,
    "user_agent" TEXT NOT NULL,
    "client_ip" TEXT,
    "total_time_on_page" INTEGER NOT NULL,
    "active_time" INTEGER NOT NULL,
    "idle_time" INTEGER NOT NULL,
    "visibility_changes" INTEGER NOT NULL DEFAULT 0,
    "scroll_depth" INTEGER NOT NULL DEFAULT 0,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL,
    "session_start" TIMESTAMPTZ NOT NULL,
    "last_activity" TIMESTAMPTZ NOT NULL,
    "page_context" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "page_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_engagements_session_id_task_record_id_key" ON "page_engagements"("session_id", "task_record_id");

-- AddForeignKey
ALTER TABLE "page_engagements" ADD CONSTRAINT "page_engagements_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
