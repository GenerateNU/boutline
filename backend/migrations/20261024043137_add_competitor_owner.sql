-- Modify "competitors" table
ALTER TABLE "competitors" ADD COLUMN "user_id" uuid NULL, ADD CONSTRAINT "fk_competitors_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
-- Create index "idx_competitors_user_id" to table: "competitors"
CREATE INDEX "idx_competitors_user_id" ON "competitors" ("user_id");
