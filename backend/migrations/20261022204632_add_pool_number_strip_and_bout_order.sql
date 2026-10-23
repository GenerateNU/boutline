-- Existing pools need a number before the column can be NOT NULL, so it is
-- added nullable, backfilled per pool stage in creation order, then tightened.
-- Modify "pools" table
ALTER TABLE "pools" ADD COLUMN "number" bigint NULL, ADD COLUMN "strip" text NULL, ADD COLUMN "start_time" timestamptz NULL;
UPDATE "pools" AS p SET "number" = n.rn FROM (SELECT id, row_number() OVER (PARTITION BY pool_stage_id ORDER BY created_at, id) AS rn FROM "pools") AS n WHERE p.id = n.id;
ALTER TABLE "pools" ALTER COLUMN "number" SET NOT NULL, ADD CONSTRAINT "chk_pools_number" CHECK (number >= 1);
-- Create index "idx_pools_pool_stage_id_number" to table: "pools"
CREATE UNIQUE INDEX "idx_pools_pool_stage_id_number" ON "pools" ("pool_stage_id", "number");
-- Existing pool bouts are numbered in schedule order so the unique index below holds.
-- Modify "bouts" table
ALTER TABLE "bouts" ADD COLUMN "pool_order" bigint NULL, ADD CONSTRAINT "chk_bouts_pool_order" CHECK (pool_order >= 1);
UPDATE "bouts" AS b SET "pool_order" = n.rn FROM (SELECT id, row_number() OVER (PARTITION BY pool_id ORDER BY start_time NULLS LAST, created_at, id) AS rn FROM "bouts" WHERE pool_id IS NOT NULL) AS n WHERE b.id = n.id;
-- Create index "idx_bouts_pool_id_pool_order" to table: "bouts"
CREATE UNIQUE INDEX "idx_bouts_pool_id_pool_order" ON "bouts" ("pool_id", "pool_order");
