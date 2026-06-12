/*
  Warnings:

  - You are about to drop the column `hints` on the `challenges` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "challenges" DROP COLUMN "hints";

-- CreateTable
CREATE TABLE "hints" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "index" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hints_challenge_id_index_key" ON "hints"("challenge_id", "index");

-- AddForeignKey
ALTER TABLE "hints" ADD CONSTRAINT "hints_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
