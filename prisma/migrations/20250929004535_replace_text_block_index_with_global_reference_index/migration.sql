-- AlterTable
ALTER TABLE "show_all_references_clicks" DROP COLUMN "text_block_index",
ADD COLUMN     "global_reference_index" INTEGER;
