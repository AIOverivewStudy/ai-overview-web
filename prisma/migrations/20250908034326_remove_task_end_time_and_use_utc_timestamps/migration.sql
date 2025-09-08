-- Custom migration to handle data conversion for time fields

-- First, add temporary columns to store converted timestamps
ALTER TABLE "task_records" ADD COLUMN "temp_task_start_time" BIGINT;
ALTER TABLE "click_events" ADD COLUMN "temp_click_time" BIGINT;
ALTER TABLE "show_more_interactions" ADD COLUMN "temp_click_time" BIGINT;
ALTER TABLE "show_all_interactions" ADD COLUMN "temp_click_time" BIGINT;

-- Convert existing string timestamps to UTC timestamps
-- Assuming the existing format is 'YYYY-MM-DD HH:MM:SS' (local time)
-- Convert to UTC timestamp in milliseconds
UPDATE "task_records" 
SET "temp_task_start_time" = EXTRACT(EPOCH FROM to_timestamp(task_start_time, 'YYYY-MM-DD HH24:MI:SS')) * 1000;

UPDATE "click_events" 
SET "temp_click_time" = EXTRACT(EPOCH FROM to_timestamp(click_time, 'YYYY-MM-DD HH24:MI:SS')) * 1000;

UPDATE "show_more_interactions" 
SET "temp_click_time" = EXTRACT(EPOCH FROM to_timestamp(click_time, 'YYYY-MM-DD HH24:MI:SS')) * 1000;

UPDATE "show_all_interactions" 
SET "temp_click_time" = EXTRACT(EPOCH FROM to_timestamp(click_time, 'YYYY-MM-DD HH24:MI:SS')) * 1000;

-- Drop old columns
ALTER TABLE "task_records" DROP COLUMN "task_end_time";
ALTER TABLE "task_records" DROP COLUMN "task_start_time";
ALTER TABLE "click_events" DROP COLUMN "click_time";
ALTER TABLE "show_more_interactions" DROP COLUMN "click_time";
ALTER TABLE "show_all_interactions" DROP COLUMN "click_time";

-- Rename temporary columns to final names
ALTER TABLE "task_records" RENAME COLUMN "temp_task_start_time" TO "task_start_time";
ALTER TABLE "click_events" RENAME COLUMN "temp_click_time" TO "click_time";
ALTER TABLE "show_more_interactions" RENAME COLUMN "temp_click_time" TO "click_time";
ALTER TABLE "show_all_interactions" RENAME COLUMN "temp_click_time" TO "click_time";

-- Add NOT NULL constraints
ALTER TABLE "task_records" ALTER COLUMN "task_start_time" SET NOT NULL;
ALTER TABLE "click_events" ALTER COLUMN "click_time" SET NOT NULL;
ALTER TABLE "show_more_interactions" ALTER COLUMN "click_time" SET NOT NULL;
ALTER TABLE "show_all_interactions" ALTER COLUMN "click_time" SET NOT NULL;