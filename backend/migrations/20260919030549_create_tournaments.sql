-- Create "tournaments" table
CREATE TABLE "tournaments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "visibility" text NOT NULL,
  "code" text NOT NULL,
  "status" text NOT NULL,
  "created_by" uuid NOT NULL,
  "completed_at" timestamptz NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_tournaments_code" to table: "tournaments"
CREATE UNIQUE INDEX "idx_tournaments_code" ON "tournaments" ("code");
-- Create index "idx_tournaments_status" to table: "tournaments"
CREATE INDEX "idx_tournaments_status" ON "tournaments" ("status");
