-- Create "examples" table
CREATE TABLE "public"."examples" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_examples_deleted_at" to table: "examples"
CREATE INDEX "idx_examples_deleted_at" ON "public"."examples" ("deleted_at");
-- Create index "idx_examples_name" to table: "examples"
CREATE UNIQUE INDEX "idx_examples_name" ON "public"."examples" ("name") WHERE (deleted_at IS NULL);
-- Create index "idx_examples_status" to table: "examples"
CREATE INDEX "idx_examples_status" ON "public"."examples" ("status");
