-- Modify "tournaments" table
ALTER TABLE "tournaments" ADD CONSTRAINT "fk_tournaments_creator" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Create index "idx_tournaments_created_by" to table: "tournaments"
CREATE INDEX "idx_tournaments_created_by" ON "tournaments" ("created_by");
