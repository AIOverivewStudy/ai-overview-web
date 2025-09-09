-- Custom migration to convert BigInt timestamps to TIMESTAMPTZ
-- This migration safely converts existing BigInt timestamps (in milliseconds) to TIMESTAMPTZ

-- Step 1: Add temporary columns for the new TIMESTAMPTZ data
ALTER TABLE "task_records" ADD COLUMN "temp_task_start_time" TIMESTAMPTZ;
ALTER TABLE "click_events" ADD COLUMN "temp_click_time" TIMESTAMPTZ;
ALTER TABLE "show_more_interactions" ADD COLUMN "temp_click_time" TIMESTAMPTZ;
ALTER TABLE "show_all_interactions" ADD COLUMN "temp_click_time" TIMESTAMPTZ;

-- Step 2: Convert existing BigInt timestamps (milliseconds) to TIMESTAMPTZ
-- Convert from Unix timestamp in milliseconds to PostgreSQL TIMESTAMPTZ
UPDATE "task_records" 
SET "temp_task_start_time" = to_timestamp("task_start_time" / 1000.0) AT TIME ZONE 'UTC'
WHERE "task_start_time" IS NOT NULL;

UPDATE "click_events" 
SET "temp_click_time" = to_timestamp("click_time" / 1000.0) AT TIME ZONE 'UTC'
WHERE "click_time" IS NOT NULL;

UPDATE "show_more_interactions" 
SET "temp_click_time" = to_timestamp("click_time" / 1000.0) AT TIME ZONE 'UTC'
WHERE "click_time" IS NOT NULL;

UPDATE "show_all_interactions" 
SET "temp_click_time" = to_timestamp("click_time" / 1000.0) AT TIME ZONE 'UTC'
WHERE "click_time" IS NOT NULL;

-- Step 3: Drop the old BigInt columns
ALTER TABLE "task_records" DROP COLUMN "task_start_time";
ALTER TABLE "click_events" DROP COLUMN "click_time";
ALTER TABLE "show_more_interactions" DROP COLUMN "click_time";
ALTER TABLE "show_all_interactions" DROP COLUMN "click_time";

-- Step 4: Rename temporary columns to final names
ALTER TABLE "task_records" RENAME COLUMN "temp_task_start_time" TO "task_start_time";
ALTER TABLE "click_events" RENAME COLUMN "temp_click_time" TO "click_time";
ALTER TABLE "show_more_interactions" RENAME COLUMN "temp_click_time" TO "click_time";
ALTER TABLE "show_all_interactions" RENAME COLUMN "temp_click_time" TO "click_time";

-- Step 5: Add NOT NULL constraints
ALTER TABLE "task_records" ALTER COLUMN "task_start_time" SET NOT NULL;
ALTER TABLE "click_events" ALTER COLUMN "click_time" SET NOT NULL;
ALTER TABLE "show_more_interactions" ALTER COLUMN "click_time" SET NOT NULL;
ALTER TABLE "show_all_interactions" ALTER COLUMN "click_time" SET NOT NULL;
