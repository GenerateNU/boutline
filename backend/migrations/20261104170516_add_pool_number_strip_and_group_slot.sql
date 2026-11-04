-- Modify "bouts" table
ALTER TABLE "bouts" ADD CONSTRAINT "chk_bouts_group_slot" CHECK (group_slot >= 1), ADD COLUMN "group_slot" bigint NULL;
-- Create index "idx_bouts_pool_id_group_slot" to table: "bouts"
CREATE UNIQUE INDEX "idx_bouts_pool_id_group_slot" ON "bouts" ("pool_id", "group_slot");
-- Modify "pools" table
ALTER TABLE "pools" ADD CONSTRAINT "chk_pools_number" CHECK (number >= 1), ADD COLUMN "number" bigint NULL, ADD COLUMN "strip" text NULL, ADD COLUMN "start_time" timestamptz NULL;
-- Existing pools have no number, so each stage's pools are numbered in creation
-- order before the column becomes required.
UPDATE "pools" SET "number" = numbered.number
FROM (SELECT "id", row_number() OVER (PARTITION BY "pool_stage_id" ORDER BY "created_at", "id") AS number FROM "pools") AS numbered
WHERE "pools"."id" = numbered.id;
ALTER TABLE "pools" ALTER COLUMN "number" SET NOT NULL;
-- Create index "idx_pools_pool_stage_id_number" to table: "pools"
CREATE UNIQUE INDEX "idx_pools_pool_stage_id_number" ON "pools" ("pool_stage_id", "number");
