-- Create index "idx_competitors_primary_club_trgm" to table: "competitors"
CREATE INDEX "idx_competitors_primary_club_trgm" ON "competitors" USING GIN ("primary_club" gin_trgm_ops);
-- Create index "idx_competitors_secondary_club_trgm" to table: "competitors"
CREATE INDEX "idx_competitors_secondary_club_trgm" ON "competitors" USING GIN ("secondary_club" gin_trgm_ops);
-- Modify "tournaments" table
ALTER TABLE "tournaments" ADD COLUMN "city" text NULL, ADD COLUMN "country" text NULL;
-- Create index "idx_tournaments_country" to table: "tournaments"
CREATE INDEX "idx_tournaments_country" ON "tournaments" ("country");
