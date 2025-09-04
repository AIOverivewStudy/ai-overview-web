-- CreateTable
CREATE TABLE "task_records" (
    "id" SERIAL NOT NULL,
    "participant_id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "treatment_group" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "task_topic" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "task_start_time" TEXT NOT NULL,
    "task_end_time" TEXT,
    "page_click_statics_1" INTEGER DEFAULT 0,
    "page_click_statics_2" INTEGER DEFAULT 0,
    "page_click_statics_3" INTEGER DEFAULT 0,
    "page_click_statics_4" INTEGER DEFAULT 0,

    CONSTRAINT "task_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" INTEGER NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "click_order" INTEGER NOT NULL,
    "page_title" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "is_ad" BOOLEAN NOT NULL,
    "position_in_serp" TEXT NOT NULL,
    "click_time" TEXT NOT NULL,
    "dwell_time_sec" DOUBLE PRECISION,
    "from_overview" BOOLEAN NOT NULL,
    "from_ai_mode" BOOLEAN NOT NULL,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_more_interactions" (
    "id" TEXT NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "click_order" INTEGER NOT NULL,
    "component_name" TEXT NOT NULL,
    "click_time" TEXT NOT NULL,

    CONSTRAINT "show_more_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "show_all_interactions" (
    "id" TEXT NOT NULL,
    "task_record_id" INTEGER NOT NULL,
    "task_id" TEXT NOT NULL,
    "click_order" INTEGER NOT NULL,
    "component_name" TEXT NOT NULL,
    "click_time" TEXT NOT NULL,

    CONSTRAINT "show_all_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_records_task_id_key" ON "task_records"("task_id");

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_more_interactions" ADD CONSTRAINT "show_more_interactions_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_all_interactions" ADD CONSTRAINT "show_all_interactions_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
