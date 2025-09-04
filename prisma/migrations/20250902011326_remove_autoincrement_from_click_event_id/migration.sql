-- AlterTable
ALTER TABLE "click_events" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "click_events_id_seq";
