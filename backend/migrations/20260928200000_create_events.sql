-- Create "events" table
CREATE TABLE "events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tournament_id" uuid NOT NULL,
  "format" text NOT NULL DEFAULT 'pool_then_direct_elimination',
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'upcoming',
  "start_time" timestamptz NULL,
  "started_at" timestamptz NULL,
  "completed_at" timestamptz NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_events_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_events_format" CHECK (format = 'pool_then_direct_elimination'::text),
  CONSTRAINT "chk_events_status" CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'ended'::text]))
);
-- Create index "idx_events_tournament_id" to table: "events"
CREATE INDEX "idx_events_tournament_id" ON "events" ("tournament_id");
