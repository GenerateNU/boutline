-- Create "bouts" table
CREATE TABLE "bouts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tournament_id" uuid NOT NULL,
  "location" text NULL,
  "start_time" timestamptz NULL,
  "started_at" timestamptz NULL,
  "completed_at" timestamptz NULL,
  "referee_id" uuid NULL,
  "time_limit_seconds" bigint NULL,
  "points_to_win" bigint NOT NULL,
  "group_number" bigint NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "competitor_1_id" uuid NOT NULL,
  "competitor_2_id" uuid NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_bouts_referee" FOREIGN KEY ("referee_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_bouts_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_bouts_distinct_competitors" CHECK (competitor_1_id <> competitor_2_id),
  CONSTRAINT "chk_bouts_group_number" CHECK (group_number >= 0),
  CONSTRAINT "chk_bouts_points_to_win" CHECK (points_to_win > 0),
  CONSTRAINT "chk_bouts_status" CHECK (status IN ('pending', 'active', 'end')),
  CONSTRAINT "chk_bouts_time_limit_seconds" CHECK (time_limit_seconds > 0)
);
-- Create index "idx_bouts_competitor_1_id" to table: "bouts"
CREATE INDEX "idx_bouts_competitor_1_id" ON "bouts" ("competitor_1_id");
-- Create index "idx_bouts_competitor_2_id" to table: "bouts"
CREATE INDEX "idx_bouts_competitor_2_id" ON "bouts" ("competitor_2_id");
-- Create index "idx_bouts_referee_id" to table: "bouts"
CREATE INDEX "idx_bouts_referee_id" ON "bouts" ("referee_id");
-- Create index "idx_bouts_status" to table: "bouts"
CREATE INDEX "idx_bouts_status" ON "bouts" ("status");
-- Create index "idx_bouts_tournament_id" to table: "bouts"
CREATE INDEX "idx_bouts_tournament_id" ON "bouts" ("tournament_id");
