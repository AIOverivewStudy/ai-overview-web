-- CreateTable
CREATE TABLE "task_records" (
    "id" SERIAL NOT NULL,
    "participant_id" TEXT NOT NULL,
    "treatment_group" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "task_topic" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "task_start_time" TIMESTAMPTZ NOT NULL,
    "page_click_statics_1" INTEGER DEFAULT 0,
    "page_click_statics_2" INTEGER DEFAULT 0,
    "page_click_statics_3" INTEGER DEFAULT 0,
    "page_click_statics_4" INTEGER DEFAULT 0,

    CONSTRAINT "task_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" SERIAL NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "click_order" INTEGER NOT NULL,
    "page_title" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "position_in_serp" TEXT NOT NULL,
    "click_time" TIMESTAMPTZ NOT NULL,
    "dwell_time_sec" DOUBLE PRECISION,
    "from_overview" BOOLEAN NOT NULL,
    "from_ai_mode" BOOLEAN NOT NULL,
    "sponsored" BOOLEAN DEFAULT false,
    "page_context" TEXT,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_all_content_clicks" (
    "id" SERIAL NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "click_order" INTEGER NOT NULL,
    "component_name" TEXT NOT NULL,
    "click_time" TIMESTAMPTZ NOT NULL,
    "page_context" TEXT,

    CONSTRAINT "show_all_content_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_all_references_clicks" (
    "id" SERIAL NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "click_order" INTEGER NOT NULL,
    "component_name" TEXT NOT NULL,
    "click_time" TIMESTAMPTZ NOT NULL,
    "page_context" TEXT,
    "filter_reference_indexes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "global_reference_index" INTEGER,
    "text_block_content" TEXT,
    "filtered_references_count" INTEGER,

    CONSTRAINT "show_all_references_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_engagements" (
    "id" SERIAL NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "user_agent" TEXT NOT NULL,
    "client_ip" TEXT,
    "total_time_on_task" INTEGER NOT NULL,
    "active_time" INTEGER NOT NULL,
    "idle_time" INTEGER NOT NULL,
    "visibility_changes" INTEGER NOT NULL DEFAULT 0,
    "max_scroll_depth" INTEGER NOT NULL DEFAULT 0,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL,
    "session_start" TIMESTAMPTZ NOT NULL,
    "last_activity" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "page_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_records_task_id_key" ON "task_records"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_engagements_task_record_id_key" ON "page_engagements"("task_record_id");

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_all_content_clicks" ADD CONSTRAINT "show_all_content_clicks_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_all_references_clicks" ADD CONSTRAINT "show_all_references_clicks_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_engagements" ADD CONSTRAINT "page_engagements_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

