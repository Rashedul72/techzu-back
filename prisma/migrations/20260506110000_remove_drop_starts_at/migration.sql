DROP INDEX IF EXISTS "drops_startsAt_idx";

ALTER TABLE "drops" DROP COLUMN IF EXISTS "startsAt";
