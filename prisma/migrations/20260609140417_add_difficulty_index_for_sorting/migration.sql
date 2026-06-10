/*
  Warnings:

  - A unique constraint covering the columns `[difficultyIndex]` on the table `difficulty` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `difficultyIndex` to the `difficulty` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "difficulty" ADD COLUMN     "difficultyIndex" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "difficulty_difficultyIndex_key" ON "difficulty"("difficultyIndex");
