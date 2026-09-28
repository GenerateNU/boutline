-- Create "competitors" table
CREATE TABLE "competitors" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "rating" text NOT NULL DEFAULT 'U',
  "team" text NOT NULL DEFAULT '',
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "chk_competitors_rating" CHECK (rating = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text, 'U'::text]))
);
-- Drop "examples" table
DROP TABLE "examples";
