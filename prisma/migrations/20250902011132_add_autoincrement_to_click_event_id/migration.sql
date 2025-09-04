-- AlterTable
CREATE SEQUENCE click_events_id_seq;
ALTER TABLE "click_events" ALTER COLUMN "id" SET DEFAULT nextval('click_events_id_seq');
ALTER SEQUENCE click_events_id_seq OWNED BY "click_events"."id";
