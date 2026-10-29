-- Modify "bouts" table
ALTER TABLE "bouts" ADD CONSTRAINT "chk_bouts_group_slot" CHECK (group_slot >= 1), ADD COLUMN "group_slot" bigint NULL;
-- Create index "idx_bouts_pool_id_group_slot" to table: "bouts"
CREATE UNIQUE INDEX "idx_bouts_pool_id_group_slot" ON "bouts" ("pool_id", "group_slot");
-- Modify "pools" table
ALTER TABLE "pools" ADD CONSTRAINT "chk_pools_number" CHECK (number >= 1), ADD COLUMN "number" bigint NOT NULL, ADD COLUMN "strip" text NULL, ADD COLUMN "start_time" timestamptz NULL;
-- Create index "idx_pools_pool_stage_id_number" to table: "pools"
CREATE UNIQUE INDEX "idx_pools_pool_stage_id_number" ON "pools" ("pool_stage_id", "number");
