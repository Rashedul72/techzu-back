-- AlterTable
ALTER TABLE "drops" ADD COLUMN "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve original listing order semantics for existing rows
UPDATE "drops" SET "startsAt" = "createdAt";

-- CreateIndex
CREATE INDEX "drops_isActive_startsAt_idx" ON "drops"("isActive", "startsAt");
