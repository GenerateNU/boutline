-- Create "scorings" table
CREATE TABLE "scorings" (
  "id" bigserial NOT NULL,
  "created_by" uuid NOT NULL,
  "points" bigint NOT NULL DEFAULT 1,
  "competitor_id" uuid NOT NULL,
  "match_id" uuid NOT NULL,
  "revoked_at" timestamptz NULL,
  "revoked_by" uuid NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_scorings_creator" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_scorings_revoker" FOREIGN KEY ("revoked_by") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "chk_scorings_points" CHECK (points >= 1)
);
-- Create index "idx_scorings_competitor_id" to table: "scorings"
CREATE INDEX "idx_scorings_competitor_id" ON "scorings" ("competitor_id");
-- Create index "idx_scorings_created_by" to table: "scorings"
CREATE INDEX "idx_scorings_created_by" ON "scorings" ("created_by");
-- Create index "idx_scorings_match_id" to table: "scorings"
CREATE INDEX "idx_scorings_match_id" ON "scorings" ("match_id");
