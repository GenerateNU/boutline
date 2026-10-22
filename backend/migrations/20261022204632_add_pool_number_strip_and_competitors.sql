-- Existing pools need a number before the column can be NOT NULL, so it is
-- added nullable, backfilled per pool stage in creation order, then tightened.
-- Modify "pools" table
ALTER TABLE "pools" ADD COLUMN "number" bigint NULL, ADD COLUMN "strip" text NULL, ADD COLUMN "start_time" timestamptz NULL;
UPDATE "pools" AS p SET "number" = n.rn FROM (SELECT id, row_number() OVER (PARTITION BY pool_stage_id ORDER BY created_at, id) AS rn FROM "pools") AS n WHERE p.id = n.id;
ALTER TABLE "pools" ALTER COLUMN "number" SET NOT NULL, ADD CONSTRAINT "chk_pools_number" CHECK (number >= 1);
-- Create index "idx_pools_pool_stage_id_number" to table: "pools"
CREATE UNIQUE INDEX "idx_pools_pool_stage_id_number" ON "pools" ("pool_stage_id", "number");
-- Create "pool_competitors" table
CREATE TABLE "pool_competitors" (
  "pool_id" uuid NOT NULL,
  "competitor_id" uuid NOT NULL,
  "position" bigint NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("pool_id", "competitor_id"),
  CONSTRAINT "fk_pool_competitors_competitor" FOREIGN KEY ("competitor_id") REFERENCES "competitors" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_pool_competitors_pool" FOREIGN KEY ("pool_id") REFERENCES "pools" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_pool_competitors_position" CHECK ("position" >= 1)
);
-- Create index "idx_pool_competitors_competitor_id" to table: "pool_competitors"
CREATE INDEX "idx_pool_competitors_competitor_id" ON "pool_competitors" ("competitor_id");
-- Create index "idx_pool_competitors_pool_id_position" to table: "pool_competitors"
CREATE UNIQUE INDEX "idx_pool_competitors_pool_id_position" ON "pool_competitors" ("pool_id", "position");
