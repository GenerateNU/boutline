-- Create "competitors" table
CREATE TABLE "competitors" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "first_name" text NOT NULL,
  "last_name" text NULL,
  "rating" text NOT NULL,
  "team" text NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Drop "examples" table
DROP TABLE "examples";