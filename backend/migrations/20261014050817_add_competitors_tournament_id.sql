-- Modify "competitors" table
ALTER TABLE "competitors" ADD COLUMN "tournament_id" uuid NOT NULL, ADD CONSTRAINT "fk_competitors_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
-- Create index "idx_competitors_tournament_id" to table: "competitors"
CREATE INDEX "idx_competitors_tournament_id" ON "competitors" ("tournament_id");
