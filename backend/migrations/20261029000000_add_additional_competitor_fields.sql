-- Modify "competitors" table
ALTER TABLE "competitors" ADD CONSTRAINT "chk_competitors_gender" CHECK (gender = ANY (ARRAY['F'::text, 'M'::text, 'O'::text])), ADD CONSTRAINT "chk_competitors_rating_year" CHECK ((rating_year >= 0) AND (rating_year <= 99)), ADD COLUMN "event_id" uuid NOT NULL, ADD COLUMN "gender" text NOT NULL, ADD COLUMN "birthdate" date NOT NULL, ADD COLUMN "division" text NOT NULL, ADD COLUMN "rating_year" smallint NULL, ADD COLUMN "primary_club" text NULL, ADD COLUMN "secondary_club" text NULL, ADD COLUMN "member_number" text NULL, ADD CONSTRAINT "fk_competitors_event" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
-- Create index "idx_competitors_event_id" to table: "competitors"
CREATE INDEX "idx_competitors_event_id" ON "competitors" ("event_id");
-- Create index "idx_competitors_event_member_number" to table: "competitors"
CREATE UNIQUE INDEX "idx_competitors_event_member_number" ON "competitors" ("event_id", "member_number");
