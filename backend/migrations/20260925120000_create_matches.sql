-- Create "matches" table
CREATE TABLE "matches" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tournament_id" uuid NOT NULL,
  "location" text NULL,
  "time" timestamptz NULL,
  "referee_id" uuid NOT NULL,
  "time_limit_seconds" bigint NULL,
  "points_to_win" bigint NOT NULL,
  "group_number" bigint NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "competitor_1_id" uuid NOT NULL,
  "competitor_2_id" uuid NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_matches_referee" FOREIGN KEY ("referee_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_matches_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_matches_distinct_competitors" CHECK (competitor_1_id <> competitor_2_id),
  CONSTRAINT "chk_matches_group_number" CHECK (group_number >= 0),
  CONSTRAINT "chk_matches_points_to_win" CHECK (points_to_win > 0),
  CONSTRAINT "chk_matches_status" CHECK (status IN ('pending', 'active', 'end')),
  CONSTRAINT "chk_matches_time_limit_seconds" CHECK (time_limit_seconds > 0)
);
-- Create index "idx_matches_competitor_1_id" to table: "matches"
CREATE INDEX "idx_matches_competitor_1_id" ON "matches" ("competitor_1_id");
-- Create index "idx_matches_competitor_2_id" to table: "matches"
CREATE INDEX "idx_matches_competitor_2_id" ON "matches" ("competitor_2_id");
-- Create index "idx_matches_referee_id" to table: "matches"
CREATE INDEX "idx_matches_referee_id" ON "matches" ("referee_id");
-- Create index "idx_matches_status" to table: "matches"
CREATE INDEX "idx_matches_status" ON "matches" ("status");
-- Create index "idx_matches_tournament_id" to table: "matches"
CREATE INDEX "idx_matches_tournament_id" ON "matches" ("tournament_id");
