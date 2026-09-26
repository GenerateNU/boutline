-- Create "tournament_users" table
CREATE TABLE "tournament_users" (
  "user_id" uuid NOT NULL,
  "tournament_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("user_id", "tournament_id"),
  CONSTRAINT "fk_tournament_users_tournament" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "fk_tournament_users_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_tournament_users_role" CHECK (role = ANY (ARRAY['referee'::text, 'admin'::text]))
);
-- Create index "idx_tournament_users_tournament_id" to table: "tournament_users"
CREATE INDEX "idx_tournament_users_tournament_id" ON "tournament_users" ("tournament_id");
