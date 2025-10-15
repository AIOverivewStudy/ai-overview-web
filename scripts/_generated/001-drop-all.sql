-- DropForeignKey
ALTER TABLE "click_events" DROP CONSTRAINT "click_events_task_record_id_fkey";

-- DropForeignKey
ALTER TABLE "page_engagements" DROP CONSTRAINT "page_engagements_task_record_id_fkey";

-- DropForeignKey
ALTER TABLE "show_all_content_clicks" DROP CONSTRAINT "show_all_content_clicks_task_record_id_fkey";

-- DropForeignKey
ALTER TABLE "show_all_references_clicks" DROP CONSTRAINT "show_all_references_clicks_task_record_id_fkey";

-- DropTable
DROP TABLE "click_events";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "page_engagements";

-- DropTable
DROP TABLE "show_all_content_clicks";

-- DropTable
DROP TABLE "show_all_references_clicks";

-- DropTable
DROP TABLE "task_records";

