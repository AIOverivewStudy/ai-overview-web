-- AlterTable
ALTER TABLE "click_events" ADD COLUMN     "page_context" TEXT;

-- AlterTable
ALTER TABLE "show_all_interactions" ADD COLUMN     "page_context" TEXT;

-- AlterTable
ALTER TABLE "show_more_interactions" ADD COLUMN     "page_context" TEXT;
