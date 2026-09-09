/*
  Warnings:

  - Made the column `embedding` on table `accepted_snippets` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "accepted_snippets_embedding_idx";

-- AlterTable
ALTER TABLE "accepted_snippets" ALTER COLUMN "embedding" SET NOT NULL;
