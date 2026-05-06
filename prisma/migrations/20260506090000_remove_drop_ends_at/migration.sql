DROP INDEX IF EXISTS "drops_startsAt_endsAt_idx";

ALTER TABLE "drops" DROP COLUMN IF EXISTS "endsAt";

CREATE INDEX "drops_startsAt_idx" ON "drops"("startsAt");
