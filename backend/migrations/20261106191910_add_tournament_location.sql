-- Modify "tournaments" table
ALTER TABLE "tournaments" ADD COLUMN "city" text NULL, ADD COLUMN "country" text NULL;
-- Create index "idx_tournaments_country" to table: "tournaments"
CREATE INDEX "idx_tournaments_country" ON "tournaments" ("country");
