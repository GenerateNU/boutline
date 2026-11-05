-- Modify "bouts" table
ALTER TABLE "bouts" ADD CONSTRAINT "chk_bouts_slot" CHECK (slot >= 1), ADD COLUMN "slot" bigint NULL;
-- Existing pool bouts have no slot, so each pool's bouts are slotted in creation
-- order before the unique index is built.
UPDATE "bouts" SET "slot" = slotted.slot
FROM (SELECT "id", row_number() OVER (PARTITION BY "pool_id" ORDER BY "created_at", "id") AS slot FROM "bouts" WHERE "pool_id" IS NOT NULL) AS slotted
WHERE "bouts"."id" = slotted.id;
-- Create index "idx_bouts_pool_id_slot" to table: "bouts"
CREATE UNIQUE INDEX "idx_bouts_pool_id_slot" ON "bouts" ("pool_id", "slot");
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
