/*
  Warnings:

  - The primary key for the `show_all_interactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `show_all_interactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `show_more_interactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `show_more_interactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "show_all_interactions" DROP CONSTRAINT "show_all_interactions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "show_all_interactions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "show_more_interactions" DROP CONSTRAINT "show_more_interactions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "show_more_interactions_pkey" PRIMARY KEY ("id");
