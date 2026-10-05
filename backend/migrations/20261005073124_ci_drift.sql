-- Create "direct_eliminations" table
CREATE TABLE "direct_eliminations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "status" text NOT NULL DEFAULT 'upcoming',
  "event_id" uuid NOT NULL,
  "started_at" timestamptz NULL,
  "completed_at" timestamptz NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "chk_direct_eliminations_status" CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'end'::text]))
);
-- Create index "idx_direct_eliminations_event_id" to table: "direct_eliminations"
CREATE INDEX "idx_direct_eliminations_event_id" ON "direct_eliminations" ("event_id");
-- Create index "idx_direct_eliminations_status" to table: "direct_eliminations"
CREATE INDEX "idx_direct_eliminations_status" ON "direct_eliminations" ("status");
