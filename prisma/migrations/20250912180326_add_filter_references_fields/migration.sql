-- AlterTable
ALTER TABLE "show_all_references_clicks" ADD COLUMN     "filter_reference_indexes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "filtered_references_count" INTEGER,
ADD COLUMN     "text_block_content" TEXT,
ADD COLUMN     "text_block_index" INTEGER;
