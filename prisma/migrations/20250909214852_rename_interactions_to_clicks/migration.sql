/*
  Warnings:

  - You are about to drop the `show_all_interactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `show_more_interactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "show_all_interactions" DROP CONSTRAINT "show_all_interactions_task_record_id_fkey";

-- DropForeignKey
ALTER TABLE "show_more_interactions" DROP CONSTRAINT "show_more_interactions_task_record_id_fkey";

-- DropTable
DROP TABLE "show_all_interactions";

-- DropTable
DROP TABLE "show_more_interactions";

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

    CONSTRAINT "show_all_references_clicks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "show_all_content_clicks" ADD CONSTRAINT "show_all_content_clicks_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_all_references_clicks" ADD CONSTRAINT "show_all_references_clicks_task_record_id_fkey" FOREIGN KEY ("task_record_id") REFERENCES "task_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
