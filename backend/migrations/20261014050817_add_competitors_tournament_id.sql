-- Modify "competitors" table
ALTER TABLE "competitors" ADD COLUMN "tournament_id" uuid NULL;
-- Backfill from the bouts a competitor appears in, which is the only record of
-- which tournament they belonged to before this column existed.
UPDATE "competitors" AS c SET "tournament_id" = b."tournament_id"
  FROM "bouts" AS b WHERE c."id" IN (b."competitor_1_id", b."competitor_2_id");
-- A competitor in no bout has no recoverable tournament, and the column is the
-- source of truth from here on, so there is nothing to keep them attached to.
DELETE FROM "competitors" WHERE "tournament_id" IS NULL;
ALTER TABLE "competitors" ALTER COLUMN "tournament_id" SET NOT NULL, ADD CONSTRAINT "fk_competitors_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
-- Create index "idx_competitors_tournament_id" to table: "competitors"
CREATE INDEX "idx_competitors_tournament_id" ON "competitors" ("tournament_id");
