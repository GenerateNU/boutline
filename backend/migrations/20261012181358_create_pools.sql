-- Create "pool_stages" table
CREATE TABLE "pool_stages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL,
  "max_competitor_per_pool" bigint NOT NULL,
  "status" text NOT NULL DEFAULT 'upcoming',
  "start_time" timestamptz NULL,
  "started_at" timestamptz NULL,
  "completed_at" timestamptz NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_pool_stages_event" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_pool_stages_max_competitor_per_pool" CHECK (max_competitor_per_pool >= 2),
  CONSTRAINT "chk_pool_stages_status" CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'ended'::text]))
);
-- Create index "idx_pool_stages_event_id" to table: "pool_stages"
CREATE INDEX "idx_pool_stages_event_id" ON "pool_stages" ("event_id");
-- Create "pools" table
CREATE TABLE "pools" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pool_stage_id" uuid NOT NULL,
  "referee_id" uuid NULL,
  "started_at" timestamptz NULL,
  "completed_at" timestamptz NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_pools_pool_stage" FOREIGN KEY ("pool_stage_id") REFERENCES "pool_stages" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_pools_referee" FOREIGN KEY ("referee_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "idx_pools_pool_stage_id" to table: "pools"
CREATE INDEX "idx_pools_pool_stage_id" ON "pools" ("pool_stage_id");
-- Create index "idx_pools_referee_id" to table: "pools"
CREATE INDEX "idx_pools_referee_id" ON "pools" ("referee_id");
-- Modify "bouts" table
ALTER TABLE "bouts" ADD COLUMN "pool_id" uuid NULL, ADD CONSTRAINT "fk_bouts_pool" FOREIGN KEY ("pool_id") REFERENCES "pools" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Create index "idx_bouts_pool_id" to table: "bouts"
CREATE INDEX "idx_bouts_pool_id" ON "bouts" ("pool_id");
