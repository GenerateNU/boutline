-- Create "athletes" table
CREATE TABLE "athletes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "member_number" text NOT NULL,
  "user_id" uuid NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_athletes_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "idx_athletes_member_number" to table: "athletes"
CREATE UNIQUE INDEX "idx_athletes_member_number" ON "athletes" ("member_number");
-- Create index "idx_athletes_user_id" to table: "athletes"
CREATE UNIQUE INDEX "idx_athletes_user_id" ON "athletes" ("user_id");
-- Modify "competitors" table
ALTER TABLE "competitors" ADD COLUMN "athlete_id" uuid NULL, ADD CONSTRAINT "fk_competitors_athlete" FOREIGN KEY ("athlete_id") REFERENCES "athletes" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Create index "idx_competitors_athlete_id" to table: "competitors"
CREATE INDEX "idx_competitors_athlete_id" ON "competitors" ("athlete_id");
